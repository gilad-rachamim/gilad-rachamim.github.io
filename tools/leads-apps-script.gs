/**
 * צינור הלידים של האתר – Google Apps Script (מחובר לגיליון "לידים – מוהל").
 *
 * מה הוא עושה:
 *  doPost   – מקבל טופס מהאתר (assets/lead.js), כותב שורה בגיליון "לידים",
 *             שולח להורה מייל עם המדריך, ולגילעד מייל + push ב-ntfy.
 *  doGet    – קישור "הסרה מהדיוור" (?u=<טוקן>) ובדיקת חיים (?ping=1).
 *  dailyNurture – טריגר יומי (10:00): שולח את מיילי ההמשך לפי הגיליון
 *             "סדרת מיילים" – רק למי שסימן הסכמה, לא בשבת וחג, עד שהסטטוס
 *             נסגר (נקבע / לא רלוונטי / דיברנו) או עד שההורה הסיר את עצמו.
 *  dailyWhatsappList – טריגר יומי (09:00): מייל לגילעד עם קישורי wa.me מוכנים
 *             לפניות ווטסאפ שהגיע זמנן (הוא לוחץ ושולח – בלי שליחה אוטומטית).
 *
 * פריסה: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * את ה-URL של ה-Web app שמים ב-assets/lead.js (LEAD_ENDPOINT).
 * מכסת MailApp בחשבון Gmail רגיל: 100 מיילים ביום.
 */

var CFG = {
  SHEET_LEADS: 'לידים',
  SHEET_SEQ: 'סדרת מיילים',
  SHEET_LOG: 'יומן',
  OWNER_EMAIL: 'gilad4049@gmail.com',
  OWNER_NAME: 'גילעד רחמים אביעד – מוהל מוסמך',
  OWNER_PHONE: '058-4049049',
  WA_INTL: '972584049049',
  PDF_URL: 'https://gilad-rachamim.github.io/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf',
  SITE: 'https://gilad-rachamim.github.io',
  NTFY_TOPIC: PropertiesService.getScriptProperties().getProperty('NTFY_TOPIC') || '',
  TZ: 'Asia/Jerusalem'
};

// עמודות גיליון "לידים" (הסדר קובע!)
var COLS = ['תאריך', 'שם', 'טלפון', 'מייל', 'מועד לידה', 'עיר', 'מקור', 'הסכמה לדיוור',
            'סטטוס', 'שלב בסדרה', 'מייל הבא', 'ווטסאפ הבא', 'טוקן', 'הערות', 'עמוד', 'utm'];
var C = {}; COLS.forEach(function (n, i) { C[n] = i; });

// ---------- קליטת טופס ----------
function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p._honey) return txt('ok');                       // בוט
    var name = clean(p['שם']), phone = normPhone(p['טלפון']), email = clean(p['email']).toLowerCase();
    if (!name || !(phone || email)) return txt('missing');
    var ss = SpreadsheetApp.getActive();
    var sh = sheet(ss, CFG.SHEET_LEADS, COLS);
    var consent = p['מאשר/ת קבלת עדכונים'] ? 'כן' : 'לא';
    var dup = findLead(sh, phone, email);
    var token = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    var utm = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].map(function (k) { return p[k] ? k + '=' + p[k] : ''; }).filter(String).join('&');
    var row = [];
    row[C['תאריך']] = new Date();
    row[C['שם']] = name; row[C['טלפון']] = phone; row[C['מייל']] = email;
    row[C['מועד לידה']] = clean(p['מועד הלידה']); row[C['עיר']] = clean(p['עיר']);
    row[C['מקור']] = clean(p['מקור']) || 'האתר'; row[C['הסכמה לדיוור']] = consent;
    row[C['סטטוס']] = dup ? 'חוזר' : 'חדש'; row[C['שלב בסדרה']] = 0;
    row[C['מייל הבא']] = consent === 'כן' ? nextSendDate(new Date(), 2) : '';
    row[C['ווטסאפ הבא']] = new Date();
    row[C['טוקן']] = token; row[C['הערות']] = dup ? 'כבר נרשם/ה בעבר (שורה ' + dup + ')' : '';
    row[C['עמוד']] = clean(p['_page']); row[C['utm']] = utm;
    sh.appendRow(row);

    if (email) sendGuideEmail(name, email, token);
    notifyOwner(name, phone, email, row[C['מועד לידה']], row[C['עיר']], row[C['מקור']], dup);
    return txt('ok');
  } catch (err) {
    log('doPost error: ' + err + ' | ' + JSON.stringify(p));
    try { MailApp.sendEmail(CFG.OWNER_EMAIL, 'שגיאה בצינור הלידים', String(err) + '\n\n' + JSON.stringify(p)); } catch (e2) {}
    return txt('error');
  }
}

// ---------- הסרה / בדיקה ----------
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return txt('alive ' + new Date());
  if (p.u) {
    var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][C['טוקן']]) === p.u) {
        sh.getRange(i + 1, C['הסכמה לדיוור'] + 1).setValue('הוסר');
        sh.getRange(i + 1, C['מייל הבא'] + 1).setValue('');
        return page('הוסרתם מרשימת הדיוור', 'לא אשלח עוד מיילים. אם תרצו לשאול משהו – אני כאן בווטסאפ ובטלפון ' + CFG.OWNER_PHONE + '.');
      }
    }
    return page('הקישור לא נמצא', 'אפשר פשוט להשיב למייל ולכתוב "הסרה".');
  }
  return page('גילעד רחמים המוהל', 'המדריך להורים: ' + CFG.SITE + '/mohel/madrich/');
}

// ---------- מייל המדריך להורה ----------
function sendGuideEmail(name, email, token) {
  var first = name.split(' ')[0];
  var subject = 'המדריך המושלם להכנה לקראת הולדת הבן – מחכה לכם';
  var body =
    'שלום ' + first + ', ומזל טוב מראש! 🙂\n\n' +
    'תודה שביקשתם את המדריך. הנה הוא:\n' + CFG.PDF_URL + '\n\n' +
    'מה כדאי לעשות עכשיו: לפתוח את רשימת הקניות (עמוד 4) ולסמן מה כבר יש בבית. ' +
    'את השאר אפשר להשלים בנחת, עוד לפני הלידה.\n\n' +
    'ועוד שני כלים חינם שיעזרו לכם:\n' +
    '• מחשבון מועד הברית: ' + CFG.SITE + '/mohel/moed/\n' +
    '• רשימת ההכנה שנשמרת בטלפון: ' + CFG.SITE + '/mohel/checklist/\n\n' +
    'יש שאלה? אני כאן בשמחה, בווטסאפ או בטלפון: ' + CFG.OWNER_PHONE + '\n' +
    'https://wa.me/' + CFG.WA_INTL + '\n\n' +
    'שלכם,\nגילעד רחמים אביעד\nמוהל מוסמך · ירושלים והסביבה, מגיע לכל הארץ\n' + CFG.SITE + '/mohel/';
  MailApp.sendEmail({ to: email, subject: subject, body: body, name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}

// ---------- הודעה לגילעד ----------
function notifyOwner(name, phone, email, due, city, source, dup) {
  var line = (dup ? 'ליד חוזר: ' : 'ליד חדש: ') + name + (city ? ' · ' + city : '') + (due ? ' · ' + due : '');
  var body = line + '\nטלפון: ' + phone + '\nמייל: ' + email + '\nמקור: ' + source +
    (phone ? '\n\nווטסאפ מוכן:\n' + waLink(phone, firstMessage(name)) : '') +
    '\n\nהגיליון: ' + SpreadsheetApp.getActive().getUrl();
  MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: line, body: body, name: 'האתר – לידים' });
  push(line, 'טלפון ' + phone + (email ? ' · ' + email : ''));
}

function firstMessage(name) {
  return 'שלום ' + name.split(' ')[0] + ', מזל טוב מראש! 🙂 אני גילעד. קיבלתם את המדריך? אשמח לשמוע מתי הלידה צפויה ואיפה אתם, ונדבר על הברית בנחת. אני כאן לכל שאלה.';
}

// ---------- סדרת מיילים (טריגר יומי) ----------
// גיליון "סדרת מיילים": שלב | ימים אחרי השלב הקודם | נושא | גוף (אפשר {שם}) | פעיל
function dailyNurture() {
  if (isShabbatOrHoliday(new Date())) return;
  var ss = SpreadsheetApp.getActive();
  var seq = sheet(ss, CFG.SHEET_SEQ, ['שלב', 'ימים אחרי השלב הקודם', 'נושא', 'גוף', 'פעיל']).getDataRange().getValues().slice(1)
    .filter(function (r) { return r[0] && String(r[4]).trim() === 'כן'; });
  if (!seq.length) return;
  var sh = sheet(ss, CFG.SHEET_LEADS, COLS);
  var data = sh.getDataRange().getValues();
  var today = new Date(), sent = 0;
  var closed = { 'נקבע': 1, 'לא רלוונטי': 1, 'דיברנו': 1 };
  for (var i = 1; i < data.length && sent < 40; i++) {
    var r = data[i];
    if (r[C['הסכמה לדיוור']] !== 'כן' || !r[C['מייל']] || closed[r[C['סטטוס']]]) continue;
    var next = r[C['מייל הבא']];
    if (!(next instanceof Date) || next > today) continue;
    var stage = Number(r[C['שלב בסדרה']] || 0) + 1;
    var tpl = seq.filter(function (s) { return Number(s[0]) === stage; })[0];
    if (!tpl) { sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(''); continue; }
    var first = String(r[C['שם']]).split(' ')[0];
    var unsub = ScriptApp.getService().getUrl() + '?u=' + r[C['טוקן']];
    var body = String(tpl[3]).replace(/\{שם\}/g, first) + '\n\n—\nלהסרה מהדיוור: ' + unsub;
    try {
      MailApp.sendEmail({ to: r[C['מייל']], subject: String(tpl[2]).replace(/\{שם\}/g, first), body: body, name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
      sent++;
      var after = seq.filter(function (s) { return Number(s[0]) === stage + 1; })[0];
      sh.getRange(i + 1, C['שלב בסדרה'] + 1).setValue(stage);
      sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(after ? nextSendDate(today, Number(after[1]) || 7) : '');
    } catch (err) { log('nurture row ' + (i + 1) + ': ' + err); }
  }
  if (sent) log('dailyNurture sent ' + sent);
}

// ---------- רשימת ווטסאפ יומית לגילעד ----------
function dailyWhatsappList() {
  if (isShabbatOrHoliday(new Date())) return;
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  var data = sh.getDataRange().getValues(), today = new Date(), lines = [];
  var closed = { 'נקבע': 1, 'לא רלוונטי': 1 };
  for (var i = 1; i < data.length; i++) {
    var r = data[i], next = r[C['ווטסאפ הבא']];
    if (!r[C['טלפון']] || closed[r[C['סטטוס']]] || !(next instanceof Date) || next > today) continue;
    lines.push('• ' + r[C['שם']] + (r[C['עיר']] ? ' (' + r[C['עיר']] + ')' : '') + ' – ' + r[C['סטטוס']] + '\n  ' + waLink(r[C['טלפון']], firstMessage(String(r[C['שם']]))));
    sh.getRange(i + 1, C['ווטסאפ הבא'] + 1).setValue(nextSendDate(today, 14));
  }
  if (!lines.length) return;
  MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: 'ווטסאפ להיום: ' + lines.length + ' הורים', body: 'לחיצה על קישור = ההודעה מוכנה בווטסאפ, רק לשלוח.\n\n' + lines.join('\n\n'), name: 'האתר – לידים' });
  push('ווטסאפ להיום: ' + lines.length + ' הורים', 'הקישורים במייל');
}

// ---------- טריגרים ----------
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyNurture').timeBased().atHour(10).everyDays(1).inTimezone(CFG.TZ).create();
  ScriptApp.newTrigger('dailyWhatsappList').timeBased().atHour(9).everyDays(1).inTimezone(CFG.TZ).create();
}

// ---------- שבת וחג ----------
// חגים תשפ"ז–תשפ"ח (יום טוב בלבד; ערב החג מ-13:00 ומוצאי החג עד 21:00 נספרים כחג)
var HOLIDAYS = ['2027-04-22', '2027-04-28', '2027-06-11', '2027-10-02', '2027-10-03', '2027-10-11', '2027-10-16', '2027-10-23'];
function isShabbatOrHoliday(d) {
  var day = Number(Utilities.formatDate(d, CFG.TZ, 'u')); // 1=שני ... 5=שישי, 6=שבת, 7=ראשון
  var hour = Number(Utilities.formatDate(d, CFG.TZ, 'H'));
  if (day === 5 && hour >= 13) return true;
  if (day === 6 && hour < 21) return true;
  var ymd = Utilities.formatDate(d, CFG.TZ, 'yyyy-MM-dd');
  var eve = Utilities.formatDate(new Date(d.getTime() + 864e5), CFG.TZ, 'yyyy-MM-dd');
  if (HOLIDAYS.indexOf(ymd) >= 0 && hour < 21) return true;
  if (HOLIDAYS.indexOf(eve) >= 0 && hour >= 13) return true;
  return false;
}
function nextSendDate(from, days) {
  var d = new Date(from.getTime() + days * 864e5);
  d.setHours(10, 0, 0, 0);
  while (isShabbatOrHoliday(d)) d = new Date(d.getTime() + 864e5);
  return d;
}

// ---------- עזר ----------
function sheet(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  return sh;
}
function findLead(sh, phone, email) {
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if ((phone && String(data[i][C['טלפון']]) === phone) || (email && String(data[i][C['מייל']]).toLowerCase() === email)) return i + 1;
  }
  return 0;
}
function clean(v) { return v ? String(v).trim().slice(0, 200) : ''; }
function normPhone(v) {
  var p = clean(v).replace(/[^\d+]/g, '');
  if (p.indexOf('+972') === 0) p = '0' + p.slice(4);
  if (p.indexOf('972') === 0 && p.length === 12) p = '0' + p.slice(3);
  return p;
}
function waLink(phone, text) {
  var intl = phone.indexOf('0') === 0 ? '972' + phone.slice(1) : phone;
  return 'https://wa.me/' + intl + '?text=' + encodeURIComponent(text);
}
function push(title, message) {
  if (!CFG.NTFY_TOPIC || isShabbatOrHoliday(new Date())) return;
  try {
    UrlFetchApp.fetch('https://ntfy.sh/' + CFG.NTFY_TOPIC, {
      method: 'post', payload: message, contentType: 'text/plain; charset=utf-8',
      headers: { 'Title': encodeRfc2047(title), 'Tags': 'baby', 'Click': SpreadsheetApp.getActive().getUrl() }, muteHttpExceptions: true
    });
  } catch (e) { log('push: ' + e); }
}
function encodeRfc2047(s) { return '=?UTF-8?B?' + Utilities.base64Encode(s, Utilities.Charset.UTF_8) + '?='; }
function log(msg) {
  try { sheet(SpreadsheetApp.getActive(), CFG.SHEET_LOG, ['תאריך', 'הודעה']).appendRow([new Date(), msg]); } catch (e) {}
}
function txt(s) { return ContentService.createTextOutput(s); }
function page(h, p) {
  return HtmlService.createHtmlOutput('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;background:#16130f;color:#f5ecda;padding:3rem 1.5rem;text-align:center"><h1 style="color:#c9a55c">' + h + '</h1><p style="font-size:1.1rem">' + p + '</p></body></html>');
}

// בדיקה ידנית מהעורך: מדמה שליחת טופס
function testPost() {
  return doPost({ parameter: { 'שם': 'בדיקה – Claude', 'טלפון': '058-4049049', 'email': CFG.OWNER_EMAIL, 'מועד הלידה': 'בעוד חודש-חודשיים', 'עיר': 'ירושלים', 'מקור': 'בדיקה', 'מאשר/ת קבלת עדכונים': 'כן' } }).getContent();
}
