// בדיקה אוטומטית ל"🧹 מה לעשות?" בתוסף (tools/chatima-ext/cmd.js + when.js).
// הרצה מתיקיית הריפו: node tools/chatima_cmd_test.js
// כל שורה: משפט בעברית, השירות שצריך לזהות, ומה חייב להופיע בכתובת / בחיפוש.
var fs = require('fs'), vm = require('vm'), path = require('path');
var dir = path.join(__dirname, 'chatima-ext'), ctx = { self: {}, console: console };
vm.createContext(ctx);
['when.js', 'cmd.js'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }); });
var C = ctx.self.HKCmd, NOW = new Date(2026, 10, 15, 12, 0); // יום ראשון 15.11.2026 בצהריים
function dec(u) { try { return decodeURIComponent(String(u || '').replace(/\+/g, ' ')); } catch (e) { return u; } }
var T = [
  // ג׳ימייל
  ['תראה מיילים מבנק הפועלים מהחודש האחרון עם קובץ', 'gmail', ['from:(bankhapoalim.co.il OR "בנק הפועלים")', 'newer_than:1m', 'has:attachment']],
  ['מיילים שלא עניתי עליהם השבוע', 'gmail', ['in:inbox -from:me', 'newer_than:7d']],
  ['מיילים שלא קראתי מאתמול', 'gmail', ['is:unread', 'newer_than:2d']],
  ['מיילים גדולים ישנים משנה', 'gmail', ['larger:10M', 'older_than:1y']],
  ['מיילים מעל 5 מגה', 'gmail', ['larger:5M']],
  ['חשבוניות מהחודש במייל', 'gmail', ['(חשבונית OR קבלה OR invoice OR receipt)', 'newer_than:1m']],
  ['מיילים ממשה כהן עם PDF', 'gmail', ['from:"משה כהן"', 'filename:pdf']],
  ['מיילים מ-dani@example.com מהשבוע', 'gmail', ['from:dani@example.com', 'newer_than:7d']],
  ['מיילים ששלחתי לרואה החשבון', 'gmail', ['in:sent', 'to:"רואה החשבון"']],
  ['להעביר לתווית חשבונות את כל המיילים מחברת חשמל', 'gmail', ['from:(iec.co.il OR "חברת חשמל")', '#search/'], function (r) { return r.act === 'label' && r.label === 'חשבונות' && r.alt[0] && /#create-filter\/from=iec\.co\.il/.test(r.alt[0].url); }],
  ['למחוק את כל הדיוור מלפני יותר משנה בג\'ימייל', 'gmail', ['category:promotions', 'older_than:1y'], function (r) { return r.act === 'delete'; }],
  ['לכתוב מייל ל-dani@example.com בנושא פגישה מחר', 'gmail', ['view=cm', 'to=dani@example.com', 'su=פגישה מחר']],
  ['מיילים בתווית לקוחות שלא נקראו', 'gmail', ['label:לקוחות', 'is:unread']],
  ['מיילים מסומנים בכוכב מ-3 חודשים', 'gmail', ['is:starred', 'newer_than:3m']],
  ['מיילים מאמזון עם המילה "משלוח"', 'gmail', ['from:(amazon OR "אמזון")', '"משלוח"']],
  ['מיילים בספאם מהיום', 'gmail', ['in:spam', 'newer_than:1d']],
  // יומן
  ['פגישה עם משה ביום שלישי בשמונה בערב לשעה, עם תזכורת', 'calendar', ['dates=20261117T200000/20261117T210000', 'text=פגישה עם משה'], function (r) { return !!r.w.remind; }],
  ['רופא שיניים מחר ב-10:30', 'calendar', ['dates=20261116T103000/20261116T113000', 'text=רופא שיניים']],
  ['תזכיר לי לשלם חשמל ביום חמישי בבוקר', 'calendar', ['dates=20261119T090000', 'text=לשלם חשמל']],
  ['ישיבת צוות כל יום שני בתשע וחצי לחצי שעה', 'calendar', ['dates=20261116T093000/20261116T100000', 'recur=RRULE:FREQ=WEEKLY;BYDAY=MO', 'text=ישיבת צוות']],
  ['יום הולדת לאמא ב-3.12', 'calendar', ['dates=20261203/20261204', 'text=יום הולדת לאמא']],
  ['שיחה עם הבנק בעוד שעה', 'calendar', ['dates=20261115T130000', 'text=שיחה עם הבנק']],
  ['תור לרופא ברבע לחמש', 'calendar', ['T164500', 'text=תור לרופא']],
  ['להוסיף ליומן חוג ציור כל יום רביעי בחמש לשעה וחצי', 'calendar', ['dates=20261118T170000/20261118T183000', 'BYDAY=WE', 'text=חוג ציור']],
  ['פגישה עם dani@example.com מחרתיים ב-14:00', 'calendar', ['dates=20261117T140000', 'add=dani@example.com']],
  ['מה יש לי מחר ביומן', 'calendar', ['calendar/r/day/2026/11/16']],
  ['מה מתוכנן השבוע', 'calendar', ['calendar/r/week/2026/11/15']],
  ['מתי הפגישה עם יוסי', 'calendar', ['calendar/r/search?q=יוסי']],
  ['ארוחת ערב משפחתית מחר בשבע בערב', 'calendar', ['dates=20261116T190000', 'text=ארוחת ערב משפחתית']],
  // דרייב
  ['קבצי PDF מהשבוע', 'drive', ['type:pdf', 'after:2026-11-08']],
  ['הקבצים הכי גדולים בדרייב', 'drive', ['drive/quota']],
  ['מה שיתפו איתי בדרייב', 'drive', ['drive/shared-with-me']],
  ['תמונות ששיתפו איתי מהחודש', 'drive', ['type:image', '-owner:me', 'after:2026-10-16']],
  ['קובץ בשם חוזה שכירות בדרייב', 'drive', ['title:"חוזה שכירות"']],
  ['מצגות שלי בדרייב ישנות משנה', 'drive', ['type:presentation', 'owner:me', 'before:2025-11-15']],
  ['לשחזר קובץ שמחקתי בדרייב', 'drive', ['drive/trash']],
  ['הקבצים האחרונים בדרייב', 'drive', ['drive/recent']],
  // מסמכים, גיליונות, מצגות
  ['מסמך חדש בשם הצעת מחיר', 'docs', ['document/create?title=הצעת מחיר']],
  ['גיליון חדש לתקציב חודשי', 'sheets', ['spreadsheets/create?title=תקציב חודשי']],
  ['לפתוח את המסמך האחרון שערכתי', 'docs', ['docs.google.com/document/u/0/']],
  ['מצגת חדשה', 'slides', ['slides.new']],
  ['גיליון אקסל חדש "רשימת מוזמנים"', 'sheets', ['spreadsheets/create?title=רשימת מוזמנים']],
  ['מסמכים ששיתפו איתי השבוע', 'drive', ['type:document', '-owner:me', 'after:2026-11-08']],
  ['טופס חדש להרשמה לחוג', 'forms', ['forms.new']],
  ['תבניות של מסמכים', 'docs', ['document/u/0/?ftv=1']],
  ['הגיליון האחרון שפתחתי', 'sheets', ['docs.google.com/spreadsheets/u/0/']],
  // ג׳ימייל – ביצוע אחרי אישור
  ['להעביר לארכיון את כל הדיוור מלפני חודש', 'gmail', ['in:inbox', 'category:promotions', 'older_than:1m'], function (r) { return r.doit && r.doit.act === 'archive'; }],
  ['לסמן בכוכב את כל המיילים מביטוח לאומי', 'gmail', ['from:(btl.gov.il OR "ביטוח לאומי")'], function (r) { return r.doit && r.doit.act === 'star' && !/is:starred/.test(r.q); }],
  ['לסמן כנקרא את כל הרשתות החברתיות', 'gmail', ['is:unread', 'category:social'], function (r) { return r.doit && r.doit.act === 'read'; }],
  ['לשים בתווית "לקוחות" את המיילים מ-office@example.com', 'gmail', ['from:office@example.com'], function (r) { return r.doit && r.doit.act === 'label' && r.doit.label === 'לקוחות'; }],
  ['להסיר אותי מרשימות תפוצה', 'gmail', ['category:promotions'], function (r) { return r.act === 'unsub' && r.alt.some(function (a) { return a.url === 'gmap:'; }); }],
  ['תווית חדשה בשם ספקים', 'gmail', ['#settings/labels']],
  ['למחוק מיילים מלינקדאין ישנים משנתיים', 'gmail', ['from:לינקדאין', 'older_than:2y'], function (r) { return r.doit && r.doit.act === 'delete'; }],
  // יומן עברי ותזכורות
  ['תתקין לי יומן עברי', 'calendar', ['hdate-he-v2.ics']],
  ['חגים יהודיים ליומן', 'calendar', ['iw.jewish']],
  ['פרשת השבוע ביומן', 'calendar', ['torah-readings-israel-he.ics']],
  ['תזכיר לי מחר בשמונה בבוקר להתקשר לבנק', 'calendar', ['dates=20261116T080000', 'text=להתקשר לבנק'], function (r) { return r.rem && r.rem.text === 'להתקשר לבנק'; }],
  ['תזכורת לשלם ארנונה ב-20.11', 'calendar', ['dates=20261120/20261121'], function (r) { return r.rem && new Date(r.rem.at).getHours() === 9; }],
  // אנשי קשר
  ['איש קשר חדש', 'contacts', ['contacts.google.com/new']],
  ['למזג אנשי קשר כפולים', 'contacts', ['contacts.google.com/merge']],
  ['קבוצה חדשה בשם משפחה באנשי קשר', 'contacts', ['contacts.google.com/'], function (r) { return /משפחה/.test(r.head); }],
  ['מה הטלפון של יוסי כהן באנשי קשר', 'contacts', ['contacts.google.com/search/יוסי כהן']],
  // Keep
  ['פתק חדש: לקנות חלב', 'keep', ['keep.new'], function (r) { return r.copy === 'לקנות חלב'; }]
];
var fail = 0;
T.forEach(function (x, i) {
  var r = C.parse(x[0], { now: NOW }), why = [];
  if (!r || r.svc !== x[1]) why.push('שירות: ' + (r && r.svc) + ' במקום ' + x[1]);
  var hay = r ? dec(r.url) + ' ' + (r.q || '') : '';
  (x[2] || []).forEach(function (need) { if (hay.indexOf(need) < 0) why.push('חסר: ' + need); });
  if (x[3] && r && !x[3](r)) why.push('בדיקה נוספת נכשלה');
  if (r && r.weak) why.push('לא הבין');
  if (why.length) { fail++; console.log('✗ ' + (i + 1) + '. ' + x[0] + '\n    ' + why.join(' | ') + '\n    ' + hay + (r && r.lines ? '\n    ' + r.lines.join(' / ') : '')); }
  else console.log('✓ ' + (i + 1) + '. ' + x[0] + '  →  ' + (r.q || dec(r.url)).slice(0, 110));
});
// הגנה: אף כתובת לא יוצאת מגוגל / hakelim / התוסף
T.forEach(function (x) { var r = C.parse(x[0], { now: NOW }); [r.url].concat((r.alt || []).map(function (a) { return a.url; })).forEach(function (u) { if (u && !/^(https:\/\/(mail|drive|docs|calendar|contacts)\.google\.com\/|https:\/\/(docs|sheets|slides|forms|keep)\.new|https:\/\/hakelim\.com\/|ext:|rem:|gmap:)/.test(u)) { fail++; console.log('✗ כתובת לא צפויה: ' + u); } }); });
console.log('\n' + (T.length - fail) + '/' + T.length + ' עברו' + (fail ? ' – ' + fail + ' נכשלו' : ''));
process.exit(fail ? 1 : 0);
