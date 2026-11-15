// מפענח "מה ומתי" בעברית לאירוע ביומן גוגל, בלי שרת.
// "רופא שיניים מחר ב-10:30" ← { title: 'רופא שיניים', start: Date, end: Date, allDay: false }
// מבין: היום, מחר, מחרתיים, הערב, יום ראשון..שבת ("ביום שלישי", "בשלישי"), 15.11, 15/11/2026, 15.11.26,
// "בעוד שעה / 20 דקות / 3 ימים / שבוע", שעה: 10:30, ב-10, בשעה 8, "בשמונה", "בשמונה וחצי", "ברבע לתשע",
// 8 בערב / בבוקר / בצהריים / בלילה, "מחר בערב", משך: "לשעה", "לשעה וחצי", "לשעתיים", "לחצי שעה", "ל-3 שעות", "ל-45 דקות",
// חוזר: "כל יום / כל שבוע / כל יום שלישי / כל חודש / כל שנה", מוזמנים: כתובת מייל בטקסט, "עם תזכורת" (נשמרת כהערה).
(function (root) {
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  var WH = [['אחת עשרה', 11], ['אחת-עשרה', 11], ['שתים עשרה', 12], ['שתיים עשרה', 12], ['שתים-עשרה', 12], ['אחת', 1], ['שתיים', 2], ['שתים', 2], ['שלוש', 3], ['ארבע', 4], ['חמש', 5], ['שש', 6], ['שבע', 7], ['שמונה', 8], ['תשע', 9], ['עשר', 10]];
  var WHRE = WH.map(function (x) { return x[0]; }).join('|');
  var NUMW = { 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6, 'שבעה': 7, 'שבע': 7, 'עשרה': 10, 'עשר': 10, 'עשרים': 20, 'שלושים': 30, 'ארבעים': 40 };
  function wordHour(w) { for (var i = 0; i < WH.length; i++) if (WH[i][0] === w) return WH[i][1]; return null; }
  function num(x) { return /^\d+(\.\d+)?$/.test(x) ? +x : NUMW[x] || null; }
  var MINW = { 'וחצי': 30, 'ורבע': 15, 'ועשרה': 10, 'ועשר': 10, 'ועשרים': 20, 'וחמישה': 5, 'וחמש': 5, 'וארבעים': 40, 'ושלושים': 30 };
  function at(d, h, m) { var x = new Date(d); x.setHours(h, m || 0, 0, 0); return x; }
  function parseWhen(text, now) {
    now = now || new Date();
    var s = ' ' + String(text || '').replace(/[־–—]/g, '-').replace(/[״"]/g, '"').replace(/\s+/g, ' ').trim() + ' ';
    var day = null, h = null, mi = 0, dur = 60, m, recur = '', remind = '', guests = [], period = '';
    function cut(re) { s = s.replace(re, ' '); }
    // מילים של פקודה, לא חלק מהשם
    cut(/\s(?:בבקשה|תוסיף|להוסיף|תכניס|להכניס|תקבע|לקבוע|תרשום|לרשום|תשים|לשים|ליצור|תיצור|צור)(?:\sלי)?(?=\s)/g);
    cut(/\s(?:ל|ב)יומן(?:\sגוגל|\sשלי)?(?=\s)/g);
    cut(/\s(?:אירוע\s(?:חדש|ביומן)|פגישה\sחדשה)(?=\s)/g);
    s = s.replace(/^\s(?:תזכיר|להזכיר|תזכירו)\sלי\s/, ' ');
    // מוזמנים: כתובות מייל
    s = s.replace(/\w[\w.+-]*@[\w-]+(?:\.[\w-]+)+/g, function (e) { guests.push(e); return ' '; });
    // תזכורת: יומן גוגל לא מקבל תזכורת בקישור – משאירים את ברירת המחדל ומציינים
    if ((m = s.match(/\s(?:ו|עם\s)?(?:תזכורת|התראה)(?:\s(?:של\s)?(\d+|חצי|שעה|יום|רבע)\s?(?:דקות|דק'|שעות|שעה)?(?:\sלפני)?)?(?=\s)/))) {
      remind = m[1] ? m[0].replace(/^\s(?:ו|עם\s)?/, '').trim() : 'תזכורת'; cut(m[0]);
    }
    // חוזר
    if ((m = s.match(new RegExp('\\s(?:ב)?כל\\s(?:יום\\s(?:ה)?(' + DAYS.join('|') + ')|(' + DAYS.join('|') + ')|יום|ערב|בוקר|שבוע|חודש|שנה)(?=\\s)')))) {
      var dn = m[1] || m[2];
      if (dn) {
        var di = DAYS.indexOf(dn); recur = 'RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[di];
        day = at(now, 0); var ad = (di - day.getDay() + 7) % 7; day.setDate(day.getDate() + ad);
      } else if (/יום|ערב|בוקר/.test(m[0])) { recur = 'RRULE:FREQ=DAILY'; if (/ערב/.test(m[0])) period = 'ערב'; if (/בוקר/.test(m[0])) period = 'בוקר'; }
      else recur = 'RRULE:FREQ=' + (/שבוע/.test(m[0]) ? 'WEEKLY' : /חודש/.test(m[0]) ? 'MONTHLY' : 'YEARLY');
      cut(m[0]);
    }
    // בעוד ...
    if ((m = s.match(/\sבעוד\s(?:(\d+(?:\.\d+)?|[א-ת]+)\s)?(דקות|דקה|שעה|שעות|שעתיים|חצי\sשעה|רבע\sשעה|יום|ימים|יומיים|שבוע|שבועות|שבועיים|חודש|חודשים)(?=\s)/))) {
      var k = m[1] ? num(m[1]) || 1 : 1, u = m[2], mins = 0, days = 0;
      if (/^דק/.test(u)) mins = k; else if (u === 'חצי שעה') mins = 30; else if (u === 'רבע שעה') mins = 15; else if (u === 'שעתיים') mins = 120; else if (/^שע/.test(u)) mins = k * 60;
      else if (u === 'יומיים') days = 2; else if (/^י/.test(u)) days = k; else if (u === 'שבועיים') days = 14; else if (/^שבוע/.test(u)) days = k * 7; else days = k * 30;
      if (mins) { var rnd = mins < 60 ? 60000 : 300000, st0 = new Date(Math.ceil((now.getTime() + mins * 60000) / rnd) * rnd); day = at(st0, 0); h = st0.getHours(); mi = st0.getMinutes(); }
      else { day = at(now, 0); day.setDate(day.getDate() + days); }
      cut(m[0]);
    }
    // משך
    if ((m = s.match(/\sל(?:משך\s)?(?:-\s?)?(\d{1,2}(?:\.\d)?)\s?שעות(?:\s(וחצי))?(?=\s)/))) { dur = +m[1] * 60 + (m[2] ? 30 : 0); cut(m[0]); }
    else if ((m = s.match(/\sל(?:משך\s)?שעתיים(?:\s(וחצי))?(?=\s)/))) { dur = 120 + (m[1] ? 30 : 0); cut(m[0]); }
    else if (/\sל(?:משך\s)?חצי\sשעה(?=\s)/.test(s)) { dur = 30; cut(/\sל(?:משך\s)?חצי\sשעה(?=\s)/); }
    else if (/\sל(?:משך\s)?רבע\sשעה(?=\s)/.test(s)) { dur = 15; cut(/\sל(?:משך\s)?רבע\sשעה(?=\s)/); }
    else if ((m = s.match(/\sל(?:משך\s)?שעה(?:\s(וחצי|ורבע))?(?=\s)/))) { dur = 60 + (m[1] === 'וחצי' ? 30 : m[1] ? 15 : 0); cut(m[0]); }
    else if ((m = s.match(/\sל(?:משך\s)?(?:-\s?)?(\d{1,3})\s?(?:דקות|דק')(?=\s)/))) { dur = +m[1]; cut(m[0]); }
    else if (/\sלכל\sהיום(?=\s)/.test(s)) { dur = -1; cut(/\sלכל\sהיום(?=\s)/); }
    // תאריך מספרי
    if (!day && (m = s.match(/\s(?:ב-?\s?|ביום\s|ל-?)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=\s)/))) {
      var y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
      day = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && day < at(now, 0)) day.setFullYear(y + 1);
      cut(m[0]);
    }
    if (!day) {
      if (/\sהערב\s/.test(s)) { day = at(now, 0); period = 'ערב'; cut(/\sהערב(?=\s)/); }
      else if (/\s(?:ה)?יום\s/.test(s) && !/\sיום\s(?:ה)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/.test(s)) { day = at(now, 0); cut(/\s(?:ה)?יום(?=\s)/); }
      else if (/\s(?:ו)?מחרתיים\s/.test(s)) { day = at(now, 0); day.setDate(day.getDate() + 2); cut(/\s(?:ו)?מחרתיים(?=\s)/); }
      else if (/\s(?:ו)?מחר\s/.test(s)) { day = at(now, 0); day.setDate(day.getDate() + 1); cut(/\s(?:ו)?מחר(?=\s)/); }
      else {
        for (var i = 0; i < DAYS.length; i++) {
          var re = new RegExp('\\s(?:ב|ביום\\s|יום\\s|ל)(?:ה)?' + DAYS[i] + '(\\s(?:ה)?בא(?:ה)?)?(?=\\s)');
          if ((m = s.match(re))) {
            day = at(now, 0); var add = (i - day.getDay() + 7) % 7; if (add === 0) add = 7;
            day.setDate(day.getDate() + add); cut(m[0]); break;
          }
        }
      }
    }
    // שעה
    if (h === null) {
      if ((m = s.match(/\s(?:ב|ב-|בשעה\s|ב\s|ל-?)?(\d{1,2}):(\d{2})(?=\s)/))) { h = +m[1]; mi = +m[2]; cut(m[0]); }
      else if ((m = s.match(new RegExp('\\s(?:ב|בשעה\\s)רבע\\sל(?:-)?(\\d{1,2}|' + WHRE + ')(?=\\s)')))) { h = (/^\d+$/.test(m[1]) ? +m[1] : wordHour(m[1])) - 1; mi = 45; if (h === 0) h = 12; cut(m[0]); }
      else if ((m = s.match(new RegExp('\\s(?:בשעה\\s|ב-|ב|ל-?)(\\d{1,2}|' + WHRE + ')(?:\\s(וחצי|ורבע|ועשרה|ועשר|ועשרים|וחמישה|וחמש|וארבעים|ושלושים))?(?=\\s)')))) {
        h = /^\d+$/.test(m[1]) ? +m[1] : wordHour(m[1]); mi = m[2] ? MINW[m[2]] : 0; cut(m[0]);
      }
    }
    if ((m = s.match(/\s(?:ב|לפנות\s|אחרי\sה)(ערב|לילה|צהריים|אחה"צ|אחר\sהצהריים|בוקר)(?=\s)/)) || (m = s.match(/\s(אחה"צ|אחר\sהצהריים)(?=\s)/))) { period = m[1]; cut(m[0]); }
    if (h !== null && h > 23) h = null;
    if (h !== null) {
      if (/ערב|לילה|צהריים|אחה"צ|אחר/.test(period)) { if (h < 12 && !(period === 'לילה' && h >= 11) && !(period === 'צהריים' && h >= 11)) h += 12; if (h === 24) h = 0; }
      else if (period !== 'בוקר' && h >= 1 && h <= 6) h += 12;   // "ב-4" כמעט תמיד אחר הצהריים
    } else if (period) {
      h = ({ 'בוקר': 9, 'צהריים': 13, 'אחה"צ': 16, 'אחר הצהריים': 16, 'ערב': 19, 'לילה': 21 })[period]; mi = 0;
      if (!day) day = at(now, 0);
    }
    var title = s.replace(/\s+/g, ' ');
    for (var r = 0; r < 3; r++) title = title.replace(/\s(?:ב|ב-|בשעה|ביום|ל|ל-|עם|ו|של|את|גם|ב-?\s?)\s*$/, ' ').replace(/^\s*(?:את|של|ש)\s/, ' ').replace(/^[\s,.\-–:]+|[\s,.\-–:]+$/g, '');
    title = title.replace(/\s+/g, ' ').trim();
    var base = { title: title, recur: recur, remind: remind, guests: guests };
    if (!day && h === null) { base.start = null; return base; }
    if (!day) { day = at(now, 0); if (at(day, h, mi) < now) day.setDate(day.getDate() + 1); }
    if (h === null || dur === -1) { var e = new Date(day); e.setDate(e.getDate() + 1); base.start = day; base.end = e; base.allDay = true; return base; }
    var st = at(day, h, mi); base.start = st; base.end = new Date(st.getTime() + dur * 60000); base.allDay = false; return base;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d, allDay) { var x = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); return allDay ? x : x + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function calendarUrl(w, details) {
    var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(w.title || 'אירוע');
    if (w.start) u += '&dates=' + stamp(w.start, w.allDay) + '/' + stamp(w.end, w.allDay) + '&ctz=Asia/Jerusalem';
    if (w.recur) u += '&recur=' + encodeURIComponent(w.recur);
    if (w.guests && w.guests.length) u += '&add=' + encodeURIComponent(w.guests.join(','));
    if (details) u += '&details=' + encodeURIComponent(details.slice(0, 1500));
    return u;
  }
  var RECUR_HE = { 'RRULE:FREQ=DAILY': 'כל יום', 'RRULE:FREQ=WEEKLY': 'כל שבוע', 'RRULE:FREQ=MONTHLY': 'כל חודש', 'RRULE:FREQ=YEARLY': 'כל שנה' };
  function recurText(r) { if (!r) return ''; if (RECUR_HE[r]) return RECUR_HE[r]; var b = r.match(/BYDAY=(\w\w)/); return b ? 'כל יום ' + DAYS[BYDAY.indexOf(b[1])] : 'חוזר'; }
  function describe(w) {
    if (!w.start) return 'בלי תאריך – תבחרו ביומן';
    var d = w.start, s = 'יום ' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1);
    s = w.allDay ? s + ' · כל היום' : s + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '–' + pad(w.end.getHours()) + ':' + pad(w.end.getMinutes());
    if (w.recur) s += ' · 🔁 ' + recurText(w.recur);
    return s;
  }
  root.HKWhen = { parse: parseWhen, calendarUrl: calendarUrl, describe: describe, recurText: recurText, DAYS: DAYS };
})(typeof self !== 'undefined' ? self : this);
