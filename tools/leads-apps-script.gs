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
  OWNER_PHONE: '058-404-9049',
  WA_INTL: '972584049049',
  PDF_URL: 'https://hakelim.com/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf',
  SITE: 'https://hakelim.com',
  NTFY_TOPIC: PropertiesService.getScriptProperties().getProperty('NTFY_TOPIC') || '',
  TZ: 'Asia/Jerusalem'
};

// עמודות גיליון "לידים" (הסדר קובע!)
var COLS = ['תאריך', 'שם', 'טלפון', 'מייל', 'מועד לידה', 'עיר', 'מקור', 'הסכמה לדיוור',
            'סטטוס', 'שלב בסדרה', 'מייל הבא', 'ווטסאפ אחרון', 'טוקן', 'הערות', 'עמוד', 'utm', 'נשלח לאחרונה'];
var C = {}; COLS.forEach(function (n, i) { C[n] = i; });

// ---------- קליטת טופס ----------
function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p._honey) return txt('ok');                       // בוט
    if (p._bk) return txt(bakashaMail(p));                // בקשות כלים: מייל אישור / "הכלי מוכן"
    var name = clean(p['שם']), phone = normPhone(p['טלפון']), email = clean(p['email']).toLowerCase();
    // הצעה לשיפור כלי ("כלים: שיפור ·"): מותר גם בלי שם ובלי פרטי קשר
    var shipur = /^כלים: שיפור/.test(clean(p['מקור']));
    if (shipur && !name) name = 'אנונימי';
    if (!name || !(phone || email || shipur)) return txt('missing');
    if (shipur && !(phone || email)) { if (tooMany('anon-shipur', 20)) return txt('ok'); }  // עד 20 הצעות אנונימיות ב-6 שעות
    else if (tooMany(email || phone)) return txt('ok');   // אותו אדם שולח שוב ושוב – לא כותבים ולא שולחים
    var mailOk = underDailyCap();                          // מעל התקרה היומית: השורה נשמרת, בלי מייל להורה
    var ss = SpreadsheetApp.getActive();
    var sh = sheet(ss, CFG.SHEET_LEADS, COLS);
    var consent = p['מאשר/ת קבלת עדכונים'] ? 'כן' : 'לא';
    // משפחת הכלים (נפש ויום-יום ועוד): הסכמה לדיוור של המיזם, לא לסדרת ההריון – לכן ערך אחר מ'כן' (dailyNurture שולח רק ל'כן')
    if (/^כלים:/.test(clean(p['מקור'])) && p['הסכמה למשפחת הכלים']) consent = 'כן – משפחת הכלים';
    var dup = findLead(sh, phone, email);
    var token = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    var utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'].map(function (k) { return p[k] ? k + '=' + p[k] : ''; }).filter(String).join('&');
    var row = [];
    row[C['תאריך']] = new Date();
    row[C['שם']] = name; row[C['טלפון']] = phone; row[C['מייל']] = email;
    row[C['מועד לידה']] = clean(p['מועד הלידה']); row[C['עיר']] = clean(p['עיר']);
    row[C['מקור']] = shipur ? String(p['מקור']).trim().slice(0, 600) : (clean(p['מקור']) || 'האתר'); row[C['הסכמה לדיוור']] = consent;
    var kelim = /^כלים:/.test(clean(p['מקור']));               // טופסי "הכלים של גילעד רחמים": בלי מדריך, בלי סדרה ובלי ווטסאפ של ברית
    var gift = isGift_(clean(p['מקור']));                       // דפי מתנה /matana/: מתנה מיד + סדרה משלהם
    row[C['סטטוס']] = kelim ? 'כלים' : gift ? 'מתנה' : dup ? 'חוזר' : 'חדש';
    row[C['ווטסאפ אחרון']] = ''; row[C['שלב בסדרה']] = ''; row[C['נשלח לאחרונה']] = '';
    row[C['טוקן']] = token; row[C['הערות']] = dup ? 'כבר נרשם/ה בעבר (שורה ' + dup + ')' : '';
    row[C['עמוד']] = clean(p['_page']); row[C['utm']] = utm;
    sh.appendRow(row.map(sheetSafe));
    sh.getRange(sh.getLastRow(), C['טלפון'] + 1).setNumberFormat('@').setValue(phone); // לשמור את ה-0 המוביל

    if (consent === 'כן' && gift) { sh.getRange(sh.getLastRow(), C['מייל הבא'] + 1).setValue(addDays(new Date(), 2)); }
    else if (consent === 'כן') { var nx = dueStep(row, new Date()).next; sh.getRange(sh.getLastRow(), C['מייל הבא'] + 1).setValue(nx ? nx[1] : ''); }
    if (email && mailOk && gift) {
      try { sendGiftEmail(name, email, token, consent, giftSlug_(clean(p['מקור']))); } catch (eG) { log('מייל מתנה נכשל: ' + eG + ' | ' + email); }
    }
    if (email && mailOk && !kelim && !gift) {
      var src = clean(p['מקור']);
      if (src === 'מחולל הודעה לברית') sendHazmanaEmail(name, email);
      else if (src === 'מחולל הודעה לזבד הבת') sendZevedEmail(name, email);
      else if (src === 'מחולל הודעה לפדיון הבן') sendPidyonEmail(name, email);
      else sendGuideEmail(name, email, token, consent);
    }
    notifyOwner(row, dup);
    if (!kelim && !gift && isGuideLead_(clean(p['מקור']))) {        // ליד של המדריך → אנשי הקשר של גילעד (לא מפיל את הטופס אם נכשל)
      try { saveLeadContact_({ name: name, phone: phone, email: email, due: row[C['מועד לידה']], city: row[C['עיר']], date: row[C['תאריך']] }, contactKeys_()); }
      catch (eC) { log('שמירת איש קשר נכשלה: ' + eC + ' | ' + name); }
    }
    if (!mailOk) log('התקרה היומית (' + DAILY_CAP + ') עברה – לא נשלח מייל להורה: ' + email);
    return txt('ok');
  } catch (err) {
    log('doPost error: ' + err + ' | ' + JSON.stringify(p));
    try { MailApp.sendEmail(CFG.OWNER_EMAIL, 'שגיאה בצינור הלידים', String(err) + '\n\n' + JSON.stringify(p)); } catch (e2) {}
    return txt('error');
  }
}

// ---------- בקשות כלים (/kelim/bakasha/) ----------
// ה-Worker kelim-bakasha מבקש מייל (no, kind, to). לפני השליחה חוזרים אליו ל-/mailcheck: הוא מאשר רק אם זו הכתובת
// שנשמרה לבקשה הזאת והמייל עוד לא נשלח. כך אי אפשר לשלוח דרכנו מייל לכתובת אחרת, ואין צורך בסוד משותף.
// הנוסחים אושרו ע"י גילעד 11.11.2026 (חבילת אישור א, כרטיסים 6-7).
var BK_API = 'https://kelim-bakasha.gilad4049.workers.dev';
function bakashaMail(p) {
  var to = clean(p.to).toLowerCase(), no = String(parseInt(p.no, 10) || ''), kind = p.kind === 'done' ? 'done' : 'new';
  if (!to || !no) return 'missing';
  if (!underDailyCap()) return 'cap';
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, to, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  var r = UrlFetchApp.fetch(BK_API + '/mailcheck?no=' + no + '&kind=' + kind + '&h=' + h, { muteHttpExceptions: true });
  var j; try { j = JSON.parse(r.getContentText()); } catch (e) { return 'no'; }
  if (!j || !j.ok) return 'no';
  var what = '<i>"' + esc(j.what) + '"</i>', board = 'hakelim.com/kelim/bakasha', subject, inner;
  if (kind === 'new') {
    subject = 'הבקשה שלכם נרשמה (מספר ' + no + ')';
    inner = 'שלום,<br><br>קיבלתי את הבקשה שלכם לכלי:<br>' + what + '<br><br><b>מספר הבקשה: ' + no + '</b><br><br>' +
      'אפשר לראות בכל רגע מה קורה איתה, בלוח הבקשות:<br><a href="https://' + board + '/#luach" style="color:#1a5fb4;font-weight:bold">' + board + '</a><br><br>' +
      'כשהכלי יהיה מוכן תקבלו ממני עוד מייל אחד, וזה הכול. לא אשלח דיוור.<br><br>תודה שכתבתם. כל בקשה כזאת עוזרת לי לדעת מה באמת חסר.';
  } else {
    var url = /^https:\/\/hakelim\.com\//.test(String(j.url)) ? String(j.url) : 'https://' + board + '/';
    subject = 'הכלי שביקשתם מוכן 🎉';
    inner = 'שלום,<br><br>ביקשתם כלי (בקשה ' + no + '):<br>' + what + '<br><br>הוא מוכן, בחינם:<br><a href="' + esc(url) + '" style="color:#1a5fb4;font-weight:bold">' + esc(url.replace(/^https:\/\//, '').replace(/\/$/, '')) + '</a><br><br>' +
      'משהו חסר בו? בתחתית הכלי יש "יש לך רעיון איך לשפר?", ואני קורא כל הצעה.<br>ואם הוא עזר לכם, שלחו אותו למי שעוד צריך.<br><br>' +
      'רוצים לפרגן? מילה חמה משמחת אותי מאוד: פשוט ענו למייל הזה. ומי שרוצה להשתתף במיזם, כל אחד לפי מה שמתאים לו:<br>' +
      '<a href="https://hakelim.com/kelim/#litmoch" style="color:#1a5fb4;font-weight:bold">hakelim.com/kelim/#litmoch</a>';
  }
  var html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + inner +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">גילעד רחמים<br>מיזם הכלים · <a href="https://hakelim.com/kelim/" style="color:#666">hakelim.com/kelim</a></div></div>';
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, body: toText(html), name: 'גילעד רחמים – מיזם הכלים', replyTo: CFG.OWNER_EMAIL });
  log('בקשת כלי ' + no + ' (' + kind + '): נשלח מייל');
  return 'sent';
}

// ---------- הסרה / בדיקה ----------
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return txt('alive ' + new Date() + ' · kelim-join · shipur-anon · bakasha');
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

// ---------- נוסחים (אושרו ע"י גילעד 2.11.2026) ----------
// כל מייל: HTML קצר, בלי תמונות. {שם} מוחלף בשם הפרטי. קישורים עם utm_source=email.
function link(path, label, code) {
  var url = /^https?:/.test(path) ? path : CFG.SITE + path + (path.indexOf('?') > -1 ? '&' : '?') + 'utm_source=email&utm_medium=nurture&utm_campaign=' + code;
  return '<a href="' + url + '" style="color:#1a5fb4;font-weight:bold">' + label + '</a>';
}
function gl(path, label) { return link(CFG.SITE + path + '?utm_source=madrich&utm_medium=email&utm_campaign=madrich-links', label); }
var SIG = 'גילעד רחמים אביעד · מוהל מוסמך · ירושלים, מגיע לכל הארץ<br><a href="https://wa.me/972584049049">058-404-9049 (ווטסאפ)</a> · gilad4049@gmail.com · hakelim.com/mohel';

function mailBody(code, variant) {
  var PDF = CFG.PDF_URL, CALC = '/mohel/moed/', LIST = '/mohel/checklist/', VIDEO = '/mohel/#shira';
  var B = {
    'E1': 'שלום {שם},<br><br>רק בודק שהמדריך נפתח אצלכם. אם לא – הנה שוב: ' + link(PDF, 'המדריך (PDF)') + '.<br><br>' +
      'וטיפ אחד שרוב ההורים לא יודעים: <b>שעת הלידה המדויקת קובעת את יום הברית.</b> תינוק שנולד אחרי השקיעה נחשב, לפי ההלכה, כאילו נולד למחרת – והברית מתאחרת ביום. אז כשהרגע יגיע, מישהו בחדר כותב את השעה. זה הכול.<br><br>' +
      '(ואם אתם סקרנים כבר עכשיו – ' + link(CALC, 'מחשבון מועד הברית', code) + ' מראה לכם באיזה יום תצא הברית לפי תאריך משוער.)<br><br>כל שאלה, גם "קטנה" – אני כאן.<br><br>גילעד',
    'E-6w': (variant ? 'לא יודע מתי הלידה אצלכם, אז אני מתחיל מהדבר שתמיד שווה לעשות מוקדם – קניות.' : 'אנחנו בערך שישה שבועות לפני. זה בדיוק הזמן לקניות – הדברים לא מתקלקלים, ואחרי הלידה תמיד עמוסים, ובתוך שמונה ימים מרימים אירוע.') + '<br><br>' +
      '<b>מה כדאי לקנות כבר עכשיו</b> (מתוך המדריך, עמ\' 4–5):<br>• סלקל – חובה כדי לצאת מבית החולים, עדיף כזה שמתחבר לשלדת העגלה.<br>• טיטולים ניו-בורן, מגבונים, חיתולי בד (גם ל"עטיפת מוהלים" שמרגיעה אחרי הברית).<br>• בית מרקחת: עזרקאין 5%, נובימול, שמן טבעי (שקדים/פרפין), אלכוהול 70% לטבור.<br>• בגד לברית בשני חלקים – חולצה ומכנס נפרדים.<br><br>' +
      '<b>מה אפשר לחכות איתו:</b> עגלה (אם אולי יקנו לכם), צעצועים, ביגוד מעבר לימים הראשונים – בברית תראו מה קיבלתם ותשלימו.<br><br>' +
      'באתר יש ' + link(LIST, 'רשימת הכנה שנשמרת בטלפון', code) + ' – מסמנים, והיא זוכרת.<br><br>' +
      (variant ? 'אם תענו לי באיזה חודש הלידה, אשלח את הטיפים בזמן הנכון.<br><br>' : '') + 'אני כאן לכל שאלה.<br>גילעד',
    'E-3w': 'בשלב הזה הרבה הורים מתחילים לשאול "איך בוחרים מוהל?". ארבע הנקודות שאני כותב במדריך, כשאלות שאפשר לשאול כל מוהל:<br><br>' +
      '1. <b>בריאות התינוק</b> – איפה למדת מילה, ואיזה הנחיות אתה נותן לטיפול אחרי הברית?<br>2. <b>זמינות</b> – אפשר לשאול אותך בווטסאפ לפני ואחרי? אתה מגיע הביתה למחרת להוריד את התחבושת?<br>3. <b>האווירה</b> – איך נראית ברית אצלך? שירים? פיוטים לפי המנהג שלנו?<br>4. <b>הנחת שלנו</b> – מה קורה אם יש צהבת? אם הלידה בקיסרי? מי מלווה אותנו עד ההחלמה?<br><br>' +
      'מוהל טוב ישמח לענות על ארבעתן. וכדאי לדבר עם מוהל כבר עכשיו, בהריון – ככה ביום הלידה רק שולחים הודעה "נולד!".<br><br>' +
      'רוצים לשמוע איך זה נשמע אצלי? ' + link(VIDEO, 'שתיים וחצי דקות של שירים ופיוטים מברית', code) + '.<br><br>אני כאן לכל שאלה.<br>גילעד',
    'E-1w': (variant ? 'אולי מוקדם, אולי בדיוק בזמן – ציר שמונה הימים, שיהיה שמור:' : 'מתקרבים. הנה הדבר היחיד שצריך לדעת כרגע – <b>שמונה הימים, יום אחרי יום:</b>') + '<br><br>' +
      'יום הלידה – מזל טוב, לנשום, לרשום את השעה. ימים 2–3 – בדיקת צהבת ושחרור; לשלוח למוהל צילום של מכתב השחרור. ימים 4–5 – כיבודים (סנדק, קוואטר, מי מברך), אולם ואוכל. ימים 5–7 – בדיקה אחרונה של המוהל, קניות אחרונות. ליל הברית – "ברית יצחק". היום השמיני – ברית, לפני השקיעה.<br><br>' +
      'במדריך יש <b>כרטיס פרטים למוהל</b> וכפתור ווטסאפ שפותח הודעה עם כל השדות מוכנים – שם, תאריך ושעת לידה, משקל, סוג לידה, צהבת. ממלאים ושולחים. ככה לא שוכחים כלום כשהכול סוער.<br><br>' +
      link(CALC, 'מחשבון מועד הברית', code) + ' – מכניסים תאריך ושעה, מקבלים את יום הברית.<br><br>שתהיה לידה קלה. אני כאן.<br>גילעד',
    'E-birth': 'אם הבן כבר נולד – <b>מזל טוב!</b> ואם עוד לא – הוא יגיע בזמן שלו, ואין מה למהר.<br><br>שלושה דברים לשבוע הראשון:<br>' +
      '<b>צהבת.</b> בבית החולים או בטיפת חלב עושים בדיקת בילירובין. שומרים את התוצאה, היום והשעה – לכך יש השפעה על מועד הברית. צהבת גבולית לא אומרת שהברית נדחית; המוהל עוקב איתכם.<br>' +
      '<b>שעת הלידה.</b> לפני השקיעה – יום הלידה הוא היום הראשון. אחרי – מתחילים לספור ממחר.<br>' +
      '<b>המועד.</b> ' + link(CALC, 'מחשבון מועד הברית', code) + ' נותן לכם את התאריך בלועזי ובעברי, ומסמן אם זה יוצא בשבת או בחג (ברית בזמנה נעשית גם בשבת; ברית שנדחתה – לא).<br>' +
      '<b>ההודעה למשפחה.</b> ' + link('/mohel/hazmana/', 'הזמנה מעוצבת לברית', code) + ' – תוך דקה, בחינם, עם קישור לאורחים לניווט, להוספה ליומן ולאישורי הגעה (מי מגיע וכמה, בלי להתרוצץ).<br>' +
      '<b>השירים.</b> ' + link('/mohel/shirim/', 'פלייליסטים לברית לפי המנהג', code) + ', לשמוע בבית ובאוטו, כדי שהמשפחה תכיר אותם עד הברית.<br><br>' +
      'נולד ויש שאלה? שלחו לי "נולד" ב' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, נולד! '), 'ווטסאפ') + ' ואחזור אליכם.<br><br>גילעד',
    'E-post': 'תודה שזכיתי להיות המוהל של הבן שלכם. היה מרגש.<br><br>' +
      '<b>לימים הקרובים</b> (במדריך): אמבטיה פעמיים ביום חמישה ימים; משחה סביב מקום הברית פעמיים ביום שלושה ימים; מעט כתמי דם והפרשה לבנה-צהבהבה – טבעי. דימום שלא נעצר, חום, או שתן שלא מגיע שעות ארוכות – מתקשרים אליי מיד, בכל שעה.<br><br>' +
      'ושתי בקשות, רק אם נוח לכם:<br>1. <b>משפט ב-Google</b> – זה מה שעוזר להורים אחרים למצוא מוהל שמלווה: ' + link(REVIEW_URL() || CFG.SITE + '/mohel/', 'לכתיבת ביקורת') + ' (חצי דקה).<br>' +
      '2. <b>מכירים מישהי בהריון?</b> המדריך חינם: hakelim.com/mohel/madrich<br><br>תגדלו אותו לתורה, לחופה ולמעשים טובים.<br>גילעד'
  };
  var b = B[code];
  return /^שלום/.test(b) ? b : 'שלום {שם},<br><br>' + b;
}
var SUBJECTS = {
  'E1': 'הצלחתם לפתוח את המדריך?',
  'E-6w': 'מה כדאי לקנות כבר עכשיו (ומה לחכות שיקבלו במתנה)',
  'E-3w': 'ארבע שאלות ששווה לשאול כל מוהל',
  'E-1w': 'שמונה ימים: מה עושים בכל יום, מהלידה ועד הברית',
  'E-birth': 'מזל טוב? (ואם עוד לא – הכול בסדר)',
  'E-post': 'פרסומת: תודה – וימי ההחלמה'
};
function REVIEW_URL() { return PropertiesService.getScriptProperties().getProperty('REVIEW_URL') || ''; }

function wrapHtml(inner, unsubUrl) {
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + inner +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">' + SIG + '</div>' +
    (unsubUrl ? '<div style="margin-top:10px;font-size:12px;color:#999">קיבלתם את המייל כי ביקשתם את המדריך באתר וסימנתם שתרצו טיפים. לא רוצים יותר? <a href="' + unsubUrl + '" style="color:#999">להסרה בלחיצה אחת</a> – ואני עדיין כאן לכל שאלה.</div>' : '') +
    '</div>';
}
function toText(html) {
  return html.replace(/<br\s*\/?>/g, '\n').replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '$2: $1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
}

// ---------- E0: מייל המדריך להורה (לכולם – מענה לבקשה) ----------
function sendGuideEmail(name, email, token, consent) {
  var first = firstName(name);
  var inner = 'שלום ' + first + ', מזל טוב מראש!<br><br>אני גילעד. הנה המדריך המושלם להכנה לקראת הולדת הבן – 17 עמודים שעושים סדר:<br>' + link(CFG.PDF_URL, 'להורדת המדריך (PDF)') + '<br><br>' +
    'מה יש בפנים: רשימת קניות לפי סדר זמנים, מתי תהיה הברית ומה חשוב בבדיקת הצהבת, תכנון האירוע והכיבודים, מה להביא לברית, איך מכינים את התינוק, הטיפול אחרי, פדיון הבן – ואיך בוחרים מוהל.<br><br>' +
    'כדאי לשמור את הקובץ בטלפון. יש בו גם כפתור "שליחת פרטי הלידה למוהל" – כשהבן ייוולד, זה חוסך לכם לזכור מה לכתוב.<br><br>' +
    'ויש עוד שלושה כלים חינם באתר: ' + link('/mohel/moed/', 'מחשבון מועד הברית', 'E0') + ' (מתי בדיוק הברית, בלועזי ובעברי), ' + link('/mohel/checklist/', 'רשימת ההכנה', 'E0') + ' שנשמרת בטלפון, ו' + link('/mohel/hazmana/', 'הזמנה מעוצבת לברית', 'E0') + ' – ממלאים מתי ואיפה, ושולחים לכל המשפחה בווטסאפ, עם כפתור ניווט ואישורי הגעה.<br><br>' +
    '<b>עוד מתנות בחינם, כשמתקרב הרגע:</b> הכל חלק ממיזם חסד – בלי הרשמה, בלי פרסומות ובלי כוונת רווח.<br>' +
    '• ' + gl('/kelim/eruim/ishurim/', 'מעקב אישורי הגעה') + ' – תדעו מי מגיע, בלי לרדוף אחרי אנשים<br>' +
    '• ' + gl('/kelim/shemot/banim/', 'שמות לבנים') + ' – משמעות, מקור והתאמה<br>' +
    '• ' + gl('/mohel/hazmana/', 'הזמנה מעוצבת לברית') + ' ו' + gl('/mohel/moed/', 'מחשבון מועד הברית') + '<br><br>' +
    'ושמרו אותי באנשי הקשר – כשהבן ייוולד, רק שולחים "נולד!" ' + gl('/mohel/kartis/gilad-rachamim-mohel.vcf', 'שמירת איש קשר') + ' · ' + link('https://www.facebook.com/profile.php?id=61596103988267', 'פייסבוק') + '<br><br>' +
    'שאלה? כל שאלה – כתבו לי ב' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, קיבלתי את המדריך. יש לי שאלה: '), 'ווטסאפ') + ' או פשוט ענו למייל הזה. אני כאן.<br><br>' +
    (consent === 'כן' ? 'סימנתם שתרצו טיפים – אשלח לכם כמה מיילים קצרים לאורך ההריון, כל אחד בזמן שהוא רלוונטי. אפשר להפסיק בכל רגע.<br><br>' : '') +
    'בברכת מזל טוב,<br>גילעד';
  var unsub = consent === 'כן' ? unsubLink(token) : '';
  var html = wrapHtml(inner, unsub);
  MailApp.sendEmail({ to: email, subject: 'המדריך שלכם להכנה לקראת הולדת הבן 🙂', htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}
// מי שנרשם במחולל ההזמנות לברית: הבן כבר נולד, אז במקום מייל ההריון – מה שעוזר עד הברית ואחריה
function sendHazmanaEmail(name, email) {
  var first = firstName(name);
  var inner = 'שלום ' + first + ', מזל טוב!<br><br>שמח שההזמנה לברית מוכנה. היא שמורה בטלפון שלכם, ואם תרצו לשנות משהו: ' + link('/mohel/hazmana/', 'חזרה להודעה', 'H0') + '.<br><br>' +
    '<b>אישורי הגעה, במתנה.</b> שלחו לאורחים את הקישור הקצר שיצאה ממנו ההודעה, והם מסמנים "מגיעים? כמה?". בלוח המעקב (הכפתור "ללוח המעקב שלי" במחולל) תראו מי אישר, כמה מגיעים ומי עוד לא ענה, ותשלחו תזכורת בלחיצה.<br><br>' +
    'כמה דברים שיעזרו לכם בימים עד הברית:<br>' +
    '• <b>רשימת ההכנה</b> – מה לקנות ומה להביא לברית, נשמרת בטלפון: ' + link('/mohel/checklist/', 'רשימת ההכנה', 'H0') + '<br>' +
    '• <b>יום הברית</b> – מה קורה ביום עצמו ואיך מכינים את התינוק: ' + link('/mohel/hachana/yom/', 'יום הברית', 'H0') + '<br>' +
    '• <b>שירים לברית</b> – חמישה פלייליסטים לפי המנהג: ' + link('/mohel/shirim/', 'לבחירת הפלייליסט', 'H0') + '<br>' +
    '• <b>אחרי הברית</b> – הטיפול בימים הראשונים, צעד אחר צעד: ' + link('/mohel/hachana/achrei/', 'הטיפול אחרי הברית', 'H0') + '<br>' +
    '• <b>המדריך המלא להורים</b> – 16 עמודים, כולל כיבודים ופדיון הבן: ' + link(CFG.PDF_URL, 'להורדה (PDF)') + '<br><br>' +
    'ואם עוד לא סגרתם מוהל, או שיש לכם שאלה – אני כאן ב' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, הכנתי באתר הזמנה לברית. '), 'ווטסאפ') + ', או פשוט ענו למייל הזה.<br><br>' +
    'שתזכו לגדל אותו לתורה, לחופה ולמעשים טובים,<br>גילעד';
  var html = wrapHtml(inner, '');
  MailApp.sendEmail({ to: email, subject: 'מזל טוב! ההזמנה לברית מוכנה – וכמה דברים לימים הקרובים', htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}
// מי שנרשם במחולל לזבד הבת: נולדה בת, אין ברית ואין מדריך – ברכה קצרה, חזרה להודעה, ואיפה מוצאים אותי
function sendZevedEmail(name, email) {
  var first = firstName(name);
  var inner = 'שלום ' + first + ', מזל טוב על הבת!<br><br>שמח שההודעה לזבד הבת מוכנה. היא שמורה בטלפון שלכם, ואם תרצו לשנות משהו: ' + link('/mohel/hazmana/?k=zeved', 'חזרה להודעה', 'Z0') + '.<br><br>' +
    '<b>אישורי הגעה, במתנה.</b> שלחו לאורחים את הקישור הקצר שיצא עם ההודעה, והם מסמנים "מגיעים? כמה?". בלוח המעקב (הכפתור "ללוח המעקב שלי" במחולל) תראו מי אישר, כמה מגיעים ומי עוד לא ענה, ותשלחו תזכורת בלחיצה.<br><br>' +
    'אני גילעד, מוהל בירושלים. אם מישהי מהמשפחה או מהחברות בהריון, או כשבעזרת ה׳ ייוולד בן, המדריך להורים לקראת הולדת הבן חינם באתר: ' + link('/mohel/madrich/', 'המדריך להורים', 'Z0') + '.<br><br>' +
    'שאלה? פשוט ענו למייל הזה, או ב' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, הכנתי באתר הודעה לזבד הבת. '), 'ווטסאפ') + '.<br><br>' +
    'שתזכו לגדל אותה לתורה, לחופה ולמעשים טובים,<br>גילעד';
  var html = wrapHtml(inner, '');
  MailApp.sendEmail({ to: email, subject: 'מזל טוב על הבת! ההודעה לזבד הבת מוכנה', htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}
// מי שנרשם במחולל לפדיון הבן: הברית כבר מאחוריהם – ברכה, חזרה להודעה, הפרק על פדיון הבן
function sendPidyonEmail(name, email) {
  var first = firstName(name);
  var inner = 'שלום ' + first + ', מזל טוב!<br><br>שמח שההודעה לפדיון הבן מוכנה. היא שמורה בטלפון שלכם, ואם תרצו לשנות משהו: ' + link('/mohel/hazmana/?k=pidyon', 'חזרה להודעה', 'P0') + '.<br><br>' +
    '<b>אישורי הגעה, במתנה.</b> שלחו לאורחים את הקישור הקצר שיצא עם ההודעה, והם מסמנים "מגיעים? כמה?". בלוח המעקב (הכפתור "ללוח המעקב שלי" במחולל) תראו מי אישר, כמה מגיעים ומי עוד לא ענה, ותשלחו תזכורת בלחיצה.<br><br>' +
    'ולפני הפדיון, בקצרה: מי חייב, מה קורה כשהיום ה-31 חל בשבת, ומה צריך להביא (כהן, חמישה מטבעות כסף, מניין וסעודה): ' + link('/mohel/hachana/pidyon/', 'פדיון הבן – מה צריך לדעת', 'P0') + '.<br>' +
    'המדריך המלא להורים, עם הפרק על הפדיון: ' + link(CFG.PDF_URL, 'להורדה (PDF)') + '.<br><br>' +
    'שאלה? פשוט ענו למייל הזה, או ב' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, הכנתי באתר הודעה לפדיון הבן. '), 'ווטסאפ') + '.<br><br>' +
    'שתזכו לגדל אותו לתורה, לחופה ולמעשים טובים,<br>גילעד';
  var html = wrapHtml(inner, '');
  MailApp.sendEmail({ to: email, subject: 'מזל טוב! ההודעה לפדיון הבן מוכנה', htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}
function unsubLink(token) { return ScriptApp.getService().getUrl() + '?u=' + token; }

// ---------- חודש הלידה ותוכנית השליחה ----------
var HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
function dueLabel(v) {
  v = String(v || '');
  var m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return HE_MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  if (v === 'born') return 'הבן כבר נולד';
  if (v === 'unknown') return 'עוד לא יודעים';
  return v;
}
function addDays(d, n) { return new Date(d.getTime() + n * 864e5); }
// מחזיר [[קוד, תאריך, וריאנט]] לפי חודש הלידה (עוגן = 15 בחודש)
function planFor(r) {
  var signup = r[C['תאריך']] instanceof Date ? r[C['תאריך']] : new Date();
  var due = String(r[C['מועד לידה']] || ''), status = r[C['סטטוס']];
  var m = due.match(/^(\d{4})-(\d{2})$/), plan;
  if (m) {
    var A = new Date(Number(m[1]), Number(m[2]) - 1, 15, 10);
    plan = [['E1', addDays(signup, 2)], ['E-6w', addDays(A, -42)], ['E-3w', addDays(A, -21)], ['E-1w', addDays(A, -7)], ['E-birth', addDays(A, 2)]];
    if (status === 'נקבע' || status === 'נערכה') plan = plan.filter(function (p) { return p[0] !== 'E-3w'; });
    if (status === 'נערכה') plan.push(['E-post', addDays(A, 24)]);
  } else if (due === 'born') {
    plan = [['E-birth', addDays(signup, 1)]];
    if (status === 'נערכה') plan.push(['E-post', addDays(signup, 20)]);
  } else {
    plan = [['E1', addDays(signup, 2)], ['E-6w', addDays(signup, 7), 1], ['E-1w', addDays(signup, 21), 1], ['E-3w', addDays(signup, 45)]];
  }
  return plan;
}
// השלב הבא שמגיע עכשיו: אחרי השלב האחרון שנשלח, שחלונו כבר הגיע; חלונות שעברו – מדלגים לאחרון שהגיע
function dueStep(r, today) {
  var plan = planFor(r), last = String(r[C['שלב בסדרה']] || ''), lastIdx = -1;
  plan.forEach(function (p, i) { if (p[0] === last) lastIdx = i; });
  var signup = r[C['תאריך']] instanceof Date ? r[C['תאריך']] : today;
  var floor = addDays(signup, 2); // שום מייל המשך לפני יומיים מההרשמה (E0 כבר יצא)
  var rest = plan.slice(lastIdx + 1), ready = rest.filter(function (p) { return p[1] <= today && today >= floor; });
  var nextFuture = rest.filter(function (p) { return p[1] > today; })[0];
  return { step: ready.length ? ready[ready.length - 1] : null, next: nextFuture || null };
}

// ---------- סדרת מיילים (טריגר יומי 10:00) ----------
function dailyNurture(dryRun) {
  if (!dryRun && isShabbatOrHoliday(new Date())) return;
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  var data = sh.getDataRange().getValues(), today = new Date(), sent = [], closed = { 'מוהל אחר': 1, 'לא רלוונטי': 1 };
  for (var i = 1; i < data.length && sent.length < 40; i++) {
    var r = data[i];
    if (isGift_(r[C['מקור']])) continue;                  // לדפי המתנה יש סדרה משלהם (giftNurture)
    if (r[C['הסכמה לדיוור']] !== 'כן' || !r[C['מייל']] || closed[r[C['סטטוס']]] || r[C['שלב בסדרה']] === 'done') continue;
    var lastSent = r[C['נשלח לאחרונה']];
    var ds = dueStep(r, today);
    if (!ds.step) { sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(ds.next ? ds.next[1] : ''); continue; }
    if (ds.step[0] !== 'E1' && lastSent instanceof Date && addDays(lastSent, 5) > today) continue; // מרווח 5 ימים
    if (ds.step[0] === 'E-post' && !REVIEW_URL()) continue; // מחכה לקישור הביקורת של Google Business
    var first = firstName(r[C['שם']]);
    var html = wrapHtml(mailBody(ds.step[0], ds.step[2]).replace(/\{שם\}/g, first), unsubLink(r[C['טוקן']]));
    if (dryRun) { sent.push((i + 1) + ':' + ds.step[0]); continue; }
    try {
      MailApp.sendEmail({ to: r[C['מייל']], subject: SUBJECTS[ds.step[0]], htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
      sent.push((i + 1) + ':' + ds.step[0]);
      sh.getRange(i + 1, C['שלב בסדרה'] + 1).setValue(ds.step[0]);
      sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(ds.next ? ds.next[1] : '');
      sh.getRange(i + 1, C['נשלח לאחרונה'] + 1).setValue(today);
    } catch (err) { log('nurture row ' + (i + 1) + ': ' + err); }
  }
  if (sent.length) log((dryRun ? 'dry ' : '') + 'dailyNurture: ' + sent.join(', '));
  try { sent = sent.concat(giftNurture(dryRun)); } catch (eN) { log('giftNurture: ' + eN); }
  return sent;
}

// ---------- רשימת ווטסאפ יומית לגילעד (09:00) ----------
// WA-1 ליד חדש · WA-2 עשרה ימים לפני (דיברנו/נקבע) · WA-3 שלושה ימים אחרי העוגן (דיברנו/נקבע) · WA-4 אחרי הברית (נערכה)
function waMessage(code, r) {
  var first = String(r[C['שם']]).split(' ')[0], due = String(r[C['מועד לידה']] || '');
  if (code === 'WA-1') return 'שלום ' + first + ', מזל טוב מראש! 🙂 אני גילעד. קיבלתם את המדריך? ' +
    (/^\d{4}-\d{2}$/.test(due) ? 'ראיתי שהלידה בערך ב' + dueLabel(due) + ' – אשמח לשמוע איפה אתם ומה כבר מוכן' : due === 'born' ? 'ראיתי שהבן כבר נולד – מזל טוב! אשמח לשמוע איפה אתם' : 'אשמח לשמוע מתי הלידה צפויה ואיפה אתם') +
    ', ונדבר על הברית בנחת. אני כאן לכל שאלה.';
  if (code === 'WA-2') return 'שלום ' + first + ', מתקרבים 🙂 רק מזכיר: כשהבן ייוולד, כתבו לי "נולד!" עם תאריך ושעת הלידה (לפני/אחרי השקיעה), ואחר כך צילום של מכתב השחרור. מכאן אני איתכם. שתהיה לידה קלה!';
  if (code === 'WA-3') return 'שלום ' + first + ', מה שלומכם? אם הבן נולד – מזל טוב ענק! 🎉 שלחו לי תאריך, שעה וצילום מכתב השחרור ואגיד לכם מתי הברית. ואם עוד לא – שיהיה בשעה טובה, ואני כאן.';
  if (code === 'WA-4') return 'שלום ' + first + ', איך הנסיך? אם הכול רגוע – נהדר, ככה זה אמור להיות. אם משהו מטריד – צלמו ושלחו, אני בודק.' +
    (REVIEW_URL() ? ' ואם בא לכם לכתוב משפט ב-Google, זה עוזר להורים אחרים למצוא מוהל שמלווה: ' + REVIEW_URL() + '.' : '') + ' תודה שזכיתי 🙏';
}
function waDue(r, today) {
  if (/^(כלים:|מתנה:)/.test(String(r[C['מקור']] || ''))) return '';
  var st = r[C['סטטוס']], done = String(r[C['ווטסאפ אחרון']] || ''), m = String(r[C['מועד לידה']] || '').match(/^(\d{4})-(\d{2})$/);
  if ((st === 'חדש' || st === 'חוזר') && done === '') return 'WA-1';
  if (!m) return st === 'נערכה' && done !== 'WA-4' ? 'WA-4' : '';
  var A = new Date(Number(m[1]), Number(m[2]) - 1, 15, 10);
  if (st === 'נערכה') return done !== 'WA-4' && today >= addDays(A, 5) ? 'WA-4' : '';
  if (st !== 'דיברנו' && st !== 'נקבע') return '';
  if (today >= addDays(A, 3) && today <= addDays(A, 10) && done !== 'WA-3') return 'WA-3';
  if (today >= addDays(A, -10) && today < addDays(A, 3) && done !== 'WA-2' && done !== 'WA-3') return 'WA-2';
  return '';
}
function dailyWhatsappList(dryRun) {
  if (!dryRun && isShabbatOrHoliday(new Date())) return;
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  var data = sh.getDataRange().getValues(), today = new Date(), lines = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i], code = r[C['טלפון']] ? waDue(r, today) : '';
    if (!code) continue;
    lines.push('<li style="margin-bottom:14px"><b>' + r[C['שם']] + '</b>' + (r[C['עיר']] ? ' · ' + r[C['עיר']] : '') + ' · ' + dueLabel(r[C['מועד לידה']]) + ' · ' + r[C['סטטוס']] + ' (' + code + ')<br>' +
      '<a href="' + waLink(String(r[C['טלפון']]), waMessage(code, r)) + '" style="font-size:17px;font-weight:bold;color:#128c7e">פתיחת ווטסאפ עם ההודעה ←</a></li>');
    if (!dryRun) sh.getRange(i + 1, C['ווטסאפ אחרון'] + 1).setValue(code);
  }
  if (!lines.length || dryRun) return lines.length;
  var html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px">לחיצה על קישור פותחת את הצ\'אט עם ההודעה מוכנה – רק לשלוח (ולתקן מילה אם רוצים).<ul>' + lines.join('') + '</ul><a href="' + SpreadsheetApp.getActive().getUrl() + '">הגיליון</a> – אחרי שיחה, לעדכן סטטוס (דיברנו / נקבע / נערכה / מוהל אחר / לא רלוונטי).</div>';
  MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: 'ווטסאפ להיום: ' + lines.length + ' הורים', htmlBody: html, body: toText(html), name: 'האתר – לידים' });
  push('ווטסאפ להיום: ' + lines.length + ' הורים', 'הקישורים במייל');
  return lines.length;
}

// ---------- טריגרים ----------
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyNurture').timeBased().atHour(10).everyDays(1).inTimezone(CFG.TZ).create();
  ScriptApp.newTrigger('dailyWhatsappList').timeBased().atHour(9).everyDays(1).inTimezone(CFG.TZ).create();
}
// בדיקה יבשה מהעורך: מה היה נשלח היום (בלי לשלוח) – נרשם ביומן
function testDryRun() { return JSON.stringify({ mails: dailyNurture(true), whatsapp: dailyWhatsappList(true) }); }
// שולח לגילעד את כל 7 המיילים כדוגמה (לבדיקת מראה בתיבה)
function testSendAllToOwner() {
  ['E1', 'E-6w', 'E-3w', 'E-1w', 'E-birth', 'E-post'].forEach(function (c) {
    var h = wrapHtml(mailBody(c).replace(/\{שם\}/g, 'גילעד'), unsubLink('test'));
    MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: '[דוגמה] ' + SUBJECTS[c], htmlBody: h, body: toText(h), name: CFG.OWNER_NAME });
  });
  sendGuideEmail('גילעד', CFG.OWNER_EMAIL, 'test', 'כן');
}

// ---------- לידים של המדריך → אנשי הקשר (18.11.2026, החלטת גילעד: "<שם> ליד מדריך") ----------
// דורש את השירות המתקדם People API בפרויקט (Services → People API, מזהה People).
// מועד הלידה, העיר ותאריך ההרשמה נכתבים בהערות של איש הקשר. מספר או מייל שכבר שמורים אצלו – לא נשמרים שוב.
var LEAD_TAG = ' ליד מדריך';
function isGuideLead_(src) { return !/^(כלים:|מתנה:|מחולל הודעה)/.test(String(src || '')); }
function contactKeys_() {
  var keys = {}, pt;
  do {
    var r = People.People.Connections.list('people/me', { personFields: 'phoneNumbers,emailAddresses', pageSize: 1000, pageToken: pt });
    (r.connections || []).forEach(function (c) {
      (c.phoneNumbers || []).forEach(function (x) { var d = String(x.value || '').replace(/\D/g, '').slice(-9); if (d.length === 9) keys['p' + d] = 1; });
      (c.emailAddresses || []).forEach(function (x) { keys['e' + String(x.value || '').toLowerCase()] = 1; });
    });
    pt = r.nextPageToken;
  } while (pt);
  return keys;
}
function saveLeadContact_(lead, keys) {
  var name = String(lead.name || '').trim(), phone = String(lead.phone || ''), em = String(lead.email || '').toLowerCase();
  var d = phone.replace(/\D/g, '').slice(-9);
  if (!name || /^בדיקה/.test(name) || (d.length !== 9 && !em)) return 'דילוג';
  if ((d.length === 9 && keys['p' + d]) || (em && keys['e' + em])) return 'קיים';
  var when = lead.date instanceof Date ? lead.date : new Date();
  var bio = ['מדריך לקראת הולדת הבן', 'נרשם ' + Utilities.formatDate(when, CFG.TZ, 'dd.MM.yyyy')];
  if (lead.due) bio.push('מועד לידה: ' + (lead.due instanceof Date ? Utilities.formatDate(lead.due, CFG.TZ, 'dd.MM.yyyy') : lead.due));
  if (lead.city) bio.push('עיר: ' + lead.city);
  var body = { names: [{ givenName: name + LEAD_TAG }], biographies: [{ value: bio.join(' · '), contentType: 'TEXT_PLAIN' }] };
  if (d.length === 9) body.phoneNumbers = [{ value: phone, type: 'mobile' }];
  if (em) body.emailAddresses = [{ value: em }];
  People.People.createContact(body);
  if (d.length === 9) keys['p' + d] = 1;
  if (em) keys['e' + em] = 1;
  return 'נשמר';
}
// הרצה חד-פעמית מהעורך: כל לידי המדריך שכבר בגיליון → אנשי הקשר (בלי כפילויות). אפשר להריץ שוב בבטחה.
function backfillLeadContacts() {
  var data = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS).getDataRange().getValues();
  var keys = contactKeys_(), n = { 'נשמר': 0, 'קיים': 0, 'דילוג': 0, 'שגיאה': 0 }, saved = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (String(r[C['סטטוס']]) === 'כלים' || !isGuideLead_(r[C['מקור']])) continue;
    var res;
    try {
      res = saveLeadContact_({ name: r[C['שם']], phone: normPhone(r[C['טלפון']]), email: clean(r[C['מייל']]), due: r[C['מועד לידה']], city: clean(r[C['עיר']]), date: r[C['תאריך']] }, keys);
    } catch (e) { res = 'שגיאה'; log('השלמת אנשי קשר, שורה ' + (i + 1) + ': ' + e); }
    n[res]++;
    if (res === 'נשמר') { saved.push(r[C['שם']]); Utilities.sleep(800); }
  }
  var msg = 'השלמת אנשי קשר: נשמרו ' + n['נשמר'] + ', כבר היו ' + n['קיים'] + ', דולגו ' + n['דילוג'] + ', שגיאות ' + n['שגיאה'] + (saved.length ? ' | ' + saved.join(', ') : '');
  log(msg);
  return msg;
}

// ---------- דפי מתנה קצרים /matana/ (24.11.2026) ----------
// מקור הטופס: "מתנה: <שם הדף>". המתנה יוצאת מיד גם בלי הסכמה; סדרת חמשת המיילים (ימים 2,4,7,10,14) רק למי שסימן הסכמה.
// הנתונים (רשימת המתנות לכל דף) נוצרים מ-tools/data/matana-pages.json על ידי tools/matana_gs_patch.py.
var MATANA = {"roe": {"gifts": [["מדריך: אילו מסמכים להביא לרואה חשבון", "/kelim/mismachim-leroe-cheshbon/", "גם כקובץ PDF להדפסה: /assets/mismachim-leroe-cheshbon.pdf"], ["מחשבון החזר מס", "/kesef/hechzer/", "בדיקה בשניות כמה אפשר לקבל בחזרה"], ["מחשבון מקדמות מס הכנסה", "/kelim/cheshbon/mikdamot/", "כמה לשלם בכל חודש"], ["מחשבון ברוטו-נטו", "/kesef/bruto-neto/", "מהמשכורת ברוטו לנטו"]]}, "orchei-din": {"gifts": [["מדריך: מה מגיע לעובד שפוטר", "/kelim/mah-magia-leoved-sheputar/", "גם כקובץ PDF להדפסה: /assets/mah-magia-leoved-sheputar.pdf"], ["זכויות בפיטורין ובהתפטרות", "/kesef/zchuyot-pitorin/", "מה מגיע ומתי"], ["פיצויי פיטורין", "/kesef/pitzuyim-pitorin/", "חישוב לפי ותק ושכר"], ["פיצויים לעובד שעתי", "/kesef/pitzuyim-shaati/", "כשהשכר לפי שעה"], ["הודעה מוקדמת", "/kesef/hodaa-mukdemet/", "כמה ימים מגיעים"], ["פדיון חופשה", "/kesef/pidyon-chufsha/", "כמה שווים ימי החופשה שנשארו"], ["דמי הבראה", "/kesef/dmey-havraa/", "הסכום לפי ותק"], ["שעות נוספות", "/kesef/shaot-nosafot/", "125% ו-150% בחישוב אחד"]]}, "esek": {"gifts": [["תפריט דיגיטלי עם QR", "/esek/tafrit/", "מקלידים מנות, בוחרים צבע ומדפיסים שלט"], ["יוצר קוד QR", "/esek/qr/", "קוד QR לכל קישור, להורדה"], ["תמחור מנה", "/esek/tmchur-mana/", "עלות, מחיר מומלץ ורווח חודשי"], ["מודעת מבצע לסטטוס", "/esek/mivtza/", "מודעה מוכנה לשיתוף"], ["הזמנות בווטסאפ עם QR", "/esek/hazmana-vatsap/", "לקוחות מזמינים אליכם ישר"]]}, "kelim": {"gifts": [["תמלול הקלטות", "/kelim/tamlul/", "הקלטה לטקסט בעברית"], ["תרגום", "/kelim/tochen/tirgum/", "תרגום טקסט ומסמכים"], ["הקראת טקסט בקול אנושי", "/kelim/tochen/hakraa/", "טקסט לקובץ שמע"], ["הנפשת תמונות", "/kelim/tochen/chaye/", "תמונה ישנה שמתחילה לזוז"], ["ניסוח מיילים", "/kelim/tochen/mail/", "נוסחים מוכנים לכל מצב"], ["חתימה על מסמכי PDF", "/kelim/machshev/chatima/", "בלי להדפיס ולסרוק"], ["פקס בחינם", "/kelim/machshev/fax/", "חלופה לפקס"], ["סידור תיקיות", "/kelim/machshev/sader/", "סדר בקבצים במחשב"], ["הבנת תלוש שכר", "/kesef/tlush/", "מה כתוב בכל שורה"], ["תזכורות", "/kelim/briut/tizkorot/", "תזכורות לתרופות ולמשימות"]]}, "claude": {"gifts": []}};
var GIFT_STEPS = [['G1', 2], ['G2', 4], ['G3', 7], ['G4', 10], ['G5', 14]];
var CHESED = 'מיזם חסד, בחינם, בלי פרסומות ובלי כוונת רווח';
var PAY = { branded: 'https://payhip.com/b/M5xC6', kit: 'https://payhip.com/b/8utXB', digital: 'https://payhip.com/b/bPiCF', group: 'https://payhip.com/b/kNyeO' };
// מוצר זול לכל דף (39 ₪) – מתמלא בשלב ב' כשהמוצר חי ב-Payhip: { name: '', price: '39 ₪', url: '', what: ['..'] }
var CHEAP = {};
// מנהלים שעברו למעקב: סטטוס "קנה" = סדרת הקונים (בלי הצעות)
function isGift_(src) { return /^מתנה:/.test(String(src || '')); }
function giftSlug_(src) { return String(src || '').replace(/^מתנה:\s*/, '').trim(); }
function pUrl(url, slug, code) { return url + (url.indexOf('?') > -1 ? '&' : '?') + 'utm_source=email&utm_medium=nurture&utm_campaign=matana-' + slug + '-' + code; }
function gBtn(url, label, green) {
  return '<a href="' + url + '" style="display:inline-block;background:' + (green ? '#1faa59' : '#e8b94a') + ';color:' + (green ? '#fff' : '#2a1f05') + ';font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px;margin:6px 0">' + label + '</a>';
}
function gWa(slug, text, label) { return gBtn('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent(text), label || 'שאלה? כתבו לי בווטסאפ', true); }
function wrapGift(inner, unsub, slug) {
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + inner +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">גילעד רחמים אביעד · הכלים של גילעד רחמים · ' + CHESED + '<br><a href="https://wa.me/' + CFG.WA_INTL + '">058-404-9049 (ווטסאפ)</a> · hakelim.com</div>' +
    (unsub ? '<div style="margin-top:10px;font-size:12px;color:#999">קיבלתם את המייל כי ביקשתם מתנה באתר וסימנתם שתרצו טיפים וכלים. לא רוצים יותר? <a href="' + unsub + '" style="color:#999">להסרה בלחיצה אחת</a>.</div>' : '') +
    '</div>';
}
function giftSend(email, subject, html) {
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}

// 12 הפרומפטים (מתנת Claude) – מועתקים מדף קבוצת Claude באתר
var CLAUDE_PROMPTS = [
  ['להתחיל נכון', ['אני רוצה לבנות [מה]. לפני שאתה כותב קוד, שאל אותי עד 5 שאלות שיעזרו לך להבין מה אני צריך.', 'תכתוב תוכנית בנקודות לבניית [כלי], בלי קוד. מה הצעדים לפי הסדר ומה הכי מסוכן שיישבר?', 'תציע לי את הגרסה הכי קטנה של [כלי] שאפשר לבנות בשעה: קלט אחד, פלט אחד.', 'תבנה לי דף HTML אחד בעברית מימין לשמאל שעושה [פעולה]. קובץ יחיד, בלי התקנות.']],
  ['כשמשהו נשבר', ['קיבלתי את השגיאה הזו: [הדבק כמו שהיא]. הסבר מה קרה בשפה פשוטה, ותתקן.', 'זה עבד אתמול ועכשיו לא. מה שינינו מאז? תציע 3 סיבות אפשריות לפי סדר סבירות.', 'הדף נראה רע בטלפון. תתאים אותו למסך צר בלי לשבור את המחשב.']],
  ['לשפר ולבדוק', ['מה יקרה אם המשתמש יכניס טקסט ריק, מספר שלילי או תו מוזר? תטפל בזה.', 'תבדוק אם יש כאן מידע פרטי (סיסמה, מפתח, טלפון) שלא כדאי שיעלה לאינטרנט.']],
  ['לעבוד חכם', ['לפני שתשנה משהו, תסביר מה אתה מתכוון לשנות ולמה, ותחכה לאישור שלי.', 'תסכם לי בחמש שורות מה עשינו עד עכשיו ומה נשאר, כדי שאמשיך מחר.', 'תבדוק את עצמך: איפה אתה לא בטוח בתשובה שנתת, ומה כדאי לי לאמת בנפרד?']]
];

// ---------- מייל המתנה (יוצא מיד) ----------
var GIFT_HEAD = {
  'roe': ['המתנות לרואי חשבון, כמו שביקשתם', 'המתנות לרואי חשבון, מוכנות. הכל בחינם ואפשר להעביר ללקוחות כמו שהוא:'],
  'orchei-din': ['המתנות לעורכי דין, כמו שביקשתם', 'המתנות לעורכי דין, מוכנות. מידע כללי ולא ייעוץ משפטי, והכלים בחינם:'],
  'esek': ['המתנות לבעלי עסקים, כמו שביקשתם', 'המתנות לעסק שלכם, מוכנות. הכל בחינם, בלי הרשמה:'],
  'claude': ['12 הפרומפטים ל-Claude, כמו שביקשתם', 'הנה 12 הפרומפטים. מעתיקים, מחליפים את מה שבסוגריים מרובעים, ומדביקים:'],
  'kelim': ['10 הכלים החינמיים, כמו שביקשתם', 'הנה עשרת הכלים הכי שימושיים באתר, מסודרים לפי תחום. הכל בחינם ובלי הרשמה:']
};
function sendGiftEmail(name, email, token, consent, slug) {
  var m = MATANA[slug], h = GIFT_HEAD[slug];
  if (!m || !h) { log('מתנה: דף לא מוכר ' + slug); return; }
  var inner = 'שלום ' + firstName(name) + ',<br><br>תודה שביקשתם. ' + h[1] + '<br><br>';
  if (slug === 'claude') {
    CLAUDE_PROMPTS.forEach(function (g) {
      inner += '<b>' + g[0] + '</b><br>' + g[1].map(function (t) { return '<div style="background:#f6f2e7;border-radius:8px;padding:8px 12px;margin:6px 0;font-size:15px">' + esc(t) + '</div>'; }).join('') + '<br>';
    });
    inner += 'ועוד: ' + link('/claude-kvutza/', 'הדף עם כל הפרומפטים', 'G0') + '<br><br>';
  } else {
    inner += m.gifts.map(function (g) { return '• ' + link(g[1], g[0], 'G0') + (g[2] ? ' – ' + g[2].replace(/גם כקובץ PDF להדפסה: (\/\S+)/, function (x, u) { return 'וגם ' + link(u, 'כקובץ PDF להדפסה', 'G0'); }) : ''); }).join('<br>') + '<br><br>';
    if (slug === 'kelim') inner += link('/matana/kelim/asara/', 'כל עשרת הכלים בדף אחד, לשמירה', 'G0') + '<br><br>';
  }
  inner += 'שאלה, או משהו שחסר לכם? פשוט ענו למייל הזה, או ' + link('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent('שלום גילעד, קיבלתי את המתנה. '), 'כתבו לי בווטסאפ') + '.<br><br>' +
    (consent === 'כן' ? 'סימנתם שתרצו טיפים: אשלח לכם בשבועיים הקרובים חמישה מיילים קצרים, טיפ אחד וכלי חינמי בכל פעם, ואפשר להפסיק בכל רגע.<br><br>' : '') +
    'בברכה,<br>גילעד';
  giftSend(email, h[0], wrapGift(inner, consent === 'כן' ? unsubLink(token) : '', slug));
}

// ---------- סדרת המיילים לדפי המתנה ----------
// טיפ + כלי חינמי: שלבים G1 (יום 2) ו-G4 (יום 10) לכל דף
var GIFT_VALUE = {
  'roe': {
    G1: ['טיפ לסוף החודש: רשימת מסמכים אחת ללקוחות', 'רוב האיחורים אצל רואי חשבון הם לא חוסר רצון של הלקוח, אלא שהוא לא יודע בדיוק מה לשלוח. רשימה קצרה וקבועה, ששולחים בתחילת כל חודש (חשבוניות הכנסה והוצאה, דפי בנק, אישורי ניכוי במקור), חוסכת את רוב ההתכתבות.', '/kelim/mismachim-leroe-cheshbon/', 'המסמכים שכל לקוח צריך להביא (להדפסה ולשליחה)'],
    G4: ['הכלי שהלקוחות שלכם ישמחו לקבל: מקדמות', 'לקוח שרואה בעצמו כמה מקדמות הוא משלם ולמה, שואל פחות בטלפון. אפשר לשלוח לו את הקישור לפני השיחה, והוא מגיע עם המספרים.', '/kelim/cheshbon/mikdamot/', 'מחשבון המקדמות']
  },
  'orchei-din': {
    G1: ['מידע כללי: מה עובד צריך לדעת לפני ששואל מה מגיע לו', 'מידע כללי, לא ייעוץ משפטי. כמעט כל שאלה על זכויות בסיום עבודה מתחילה בשלוש עובדות: תאריך תחילת העבודה, תאריך הסיום, והשכר האחרון. כשהלקוח מביא אותן כבר בפנייה הראשונה, שיחת הייעוץ הראשונה נעשית מדויקת הרבה יותר.', '/kelim/mah-magia-leoved-sheputar/', 'מה מגיע לעובד שהתפטר או פוטר (דף להדפסה)'],
    G4: ['שני חישובים שלקוחות שואלים כל הזמן', 'מידע כללי, לא ייעוץ משפטי. הודעה מוקדמת ושעות נוספות הן שתי השאלות הנפוצות ביותר. כלי חישוב שהלקוח יכול להפעיל בעצמו לפני הפגישה חוסך זמן לשניכם.', '/kesef/hodaa-mukdemet/', 'מחשבון הודעה מוקדמת']
  },
  'esek': {
    G1: ['שלט QR אחד על הדלפק, והלקוח כבר בווטסאפ שלכם', 'הלקוח כבר מחזיק טלפון ביד. QR על הדלפק, על הכרטיס ועל החשבונית שפותח צ׳אט ישר אליכם הופך מבט מזדמן לפנייה, בלי להקליד מספר.', '/esek/qr/', 'יוצר קוד QR לעסק'],
    G4: ['מבצע בדף אחד שמשתפים בווטסאפ', 'מבצע שנשלח כדף יפה עם כפתור, ולא כהודעת טקסט ארוכה, נקרא ומשותף הרבה יותר. אפשר להכין אחד תוך כמה דקות.', '/esek/mivtza/', 'יוצר דף מבצע']
  },
  'claude': {
    G1: ['הפרומפט האחד שמשנה את התוצאה: "שאל אותי קודם"', 'ההבדל הכי גדול בין תוצאה בינונית לתוצאה טובה הוא לא הפרומפט המושלם, אלא שהוא שואל אתכם קודם. תנסו: "אני רוצה לבנות [מה]. לפני שאתה כותב קוד, שאל אותי עד 5 שאלות שיעזרו לך להבין מה אני צריך." שלוש דקות של שאלות חוסכות שעה של תיקונים.', '/claude-kvutza/', 'כל הפרומפטים והקבוצה'],
    G4: ['תבקשו ממנו לבדוק את עצמו', 'Claude יכול לטעות בביטחון מלא. אחרי כל תשובה חשובה כתבו: "תבדוק את עצמך: איפה אתה לא בטוח בתשובה שנתת, ומה כדאי לי לאמת בנפרד?" זה לוקח עשר שניות והופך אותו לשותף זהיר יותר.', '/claude-kvutza/', 'עוד פרומפטים לעבודה חכמה']
  },
  'kelim': {
    G1: ['הכלי שחוסך הכי הרבה זמן: תמלול', 'הקלטה של שיחה, שיעור או הודעה קולית הופכת לטקסט בכמה דקות. אחר כך אפשר לחפש בה מילה, להעתיק ציטוט או לשלוח סיכום. בחינם ובלי הרשמה.', '/kelim/tamlul/', 'תמלול הקלטה לטקסט'],
    G4: ['מייל שנשמע כמו שרצית לכתוב', 'לפעמים הכי קשה זה הנוסח. הכלי הזה מקבל כמה מילים ומחזיר מייל מסודר, בטון שתבחרו.', '/kelim/tochen/mail/', 'ניסוח מייל']
  }
};
function giftWho_(slug) { return slug === 'roe' || slug === 'orchei-din' ? 'המשרד' : 'העסק'; }
// מחזיר [נושא, גוף] לשלב מסוים של הסדרה
function giftMail(slug, step) {
  var v = GIFT_VALUE[slug], cheap = CHEAP[slug], who = giftWho_(slug), wa = function (t, l) { return gWa(slug, t, l); };
  var BR = '<br><br>', L = function (u, t) { return link(u, t, step); };
  if (step === 'G1' || step === 'G4') {
    return [v[step][0], 'שלום {שם},' + BR + v[step][1] + BR + L(v[step][2], v[step][3]) + BR + 'בברכה,<br>גילעד'];
  }
  if (slug === 'claude') {
    var grp = gBtn(pUrl(PAY.group, slug, step), 'אני רוצה להצטרף לקבוצה');
    var what = '<ul><li>קבוצת ווטסאפ פרטית, עם גילעד כמנטור</li><li>ערכה של 30 פרומפטים ב-PDF</li><li>טיפ יומי ו"כלי היום"</li></ul>18 ₪, תשלום חד-פעמי, בלי חיוב אוטומטי, ו-14 יום להחזר כספי.';
    if (step === 'G2') return ['מקום לשאלות: קבוצת Claude עם מנטור', 'שלום {שם},' + BR + 'אחרי שניסיתם את הפרומפטים, בדרך כלל עולות שאלות: למה זה לא עבד, איך מתקדמים, מה עוד אפשר לבנות. בשביל זה יש קבוצה:' + what + BR + grp + BR + 'בברכה,<br>גילעד'];
    if (step === 'G3') return ['מה עושים בקבוצה בפועל', 'שלום {שם},' + BR + 'בקבוצה אני מעלה כל יום טיפ קצר וכלי אחד שאפשר להפעיל באותו יום, ואפשר לשאול אותי ישירות כשנתקעים. אין הרצאות ארוכות: רק דברים שעובדים.' + BR + what + BR + grp + BR + 'בברכה,<br>גילעד'];
    return ['המייל האחרון בסדרה: הקבוצה', 'שלום {שם},' + BR + 'זה המייל האחרון בסדרה. אם עדיין רוצים ללמוד לעבוד עם Claude יחד איתי, הקבוצה פתוחה:' + what + BR + grp + BR + 'ובכל מקרה, הפרומפטים שקיבלתם נשארים שלכם. בהצלחה!<br>גילעד'];
  }
  var b290 = gBtn(pUrl(PAY.branded, slug, step), 'לפרטים על כלי ממותג, 290 ₪');
  if (step === 'G2') {
    if (cheap && cheap.url) return [cheap.name + ' – ' + cheap.price, 'שלום {שם},' + BR + 'הכנתי משהו שחוסך זמן ל' + who + ': <b>' + cheap.name + '</b>.<ul>' + cheap.what.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' + cheap.price + ', תשלום חד-פעמי, 14 יום להחזר כספי.' + BR + gBtn(pUrl(cheap.url, slug, step), 'לפרטים והורדה, ' + cheap.price) + BR + 'בברכה,<br>גילעד'];
    return ['איזה כלי חסר לכם?', 'שלום {שם},' + BR + 'אני בונה כלים חינמיים לפי מה שאנשים צריכים בפועל. איזה כלי היה חוסך לכם הכי הרבה זמן ב' + who + '? ענו למייל הזה בשורה אחת, ואם אפשר, אבנה אותו.' + BR + wa('שלום גילעד, הכלי שחסר לי הוא: ', 'לכתוב לי בווטסאפ') + BR + 'בברכה,<br>גילעד'];
  }
  if (step === 'G3') return ['הכלי שלכם, בלוגו ובצבעים של ' + who, 'שלום {שם},' + BR + 'אם אתם משתמשים בכלי חינמי ורוצים שיהיה בלוגו ובצבעים של ' + who + ':<ul><li>כלי אחד, בלוגו, בצבעים ובקישור משלכם, עם קוד QR</li><li>כפתור "שלחו לי את התוצאה בוואטסאפ" שמביא פניות ישר אליכם</li><li>מוכן תוך 48 שעות, עם סבב תיקונים אחד</li></ul>290 ₪, תשלום חד-פעמי, בלי מנוי, כולל קבלה.' + BR + b290 + BR + 'בברכה,<br>גילעד'];
  return ['המייל האחרון: חבילות לעסק', 'שלום {שם},' + BR + 'זה המייל האחרון בסדרה. אם רוצים יותר מכלי אחד:<ul><li><b>590 ₪</b> – עד שלושה מחשבונים בלוגו שלכם, קוד הטמעה, דף מרכז, דוח חודשי ושני סבבי תיקונים. ' + link(pUrl(PAY.kit, slug, step), 'לפרטים', step) + '</li><li><b>990 ₪</b> – החבילה המלאה ועוד כרטיס ביקור דיגיטלי ודף עסק קטן. ' + link(pUrl(PAY.digital, slug, step), 'לפרטים', step) + '</li></ul>תשלום חד-פעמי, בלי מנוי. שאלות? ענו למייל הזה.' + BR + 'בהצלחה,<br>גילעד'];
}
// כל השלבים בסדרה אחת (לבדיקה ולשליחת דוגמה)
function giftSeries_(dryRun) {
  if (!dryRun && isShabbatOrHoliday(new Date())) return [];
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  var data = sh.getDataRange().getValues(), today = new Date(), sent = [], seen = {};
  for (var i = 1; i < data.length && sent.length < 25; i++) {
    var r = data[i];
    if (!isGift_(r[C['מקור']]) || r[C['הסכמה לדיוור']] !== 'כן' || !r[C['מייל']] || r[C['סטטוס']] !== 'מתנה') continue;
    var last = String(r[C['שלב בסדרה']] || ''), idx = -1;
    GIFT_STEPS.forEach(function (s, k) { if (s[0] === last) idx = k; });
    var nxt = GIFT_STEPS[idx + 1];
    if (!nxt) continue;                                    // G5 נשלח – הסדרה הסתיימה
    var em = String(r[C['מייל']]).toLowerCase();
    if (seen[em]) continue;                                // אותו מייל בכמה שורות – פעם אחת בריצה
    var signup = r[C['תאריך']] instanceof Date ? r[C['תאריך']] : today, due = addDays(signup, nxt[1]);
    if (due > today) { if (!dryRun) sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(due); continue; }
    var lastSent = r[C['נשלח לאחרונה']];
    if (lastSent instanceof Date && addDays(lastSent, 2) > today) continue;   // מרווח של יומיים לפחות
    var slug = giftSlug_(r[C['מקור']]);
    if (!MATANA[slug]) continue;
    if (!dryRun && MailApp.getRemainingDailyQuota() < 15) break;              // משאירים מקום למיילים החדשים
    seen[em] = 1;
    var m = giftMail(slug, nxt[0]), html = wrapGift(m[1].replace(/\{שם\}/g, firstName(r[C['שם']])), unsubLink(r[C['טוקן']]), slug);
    if (dryRun) { sent.push((i + 1) + ':' + slug + ':' + nxt[0]); continue; }
    try {
      giftSend(r[C['מייל']], m[0], html);
      sent.push((i + 1) + ':' + slug + ':' + nxt[0]);
      sh.getRange(i + 1, C['שלב בסדרה'] + 1).setValue(nxt[0]);
      var after = GIFT_STEPS[idx + 2];
      sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(after ? addDays(signup, after[1]) : '');
      sh.getRange(i + 1, C['נשלח לאחרונה'] + 1).setValue(today);
    } catch (err) { log('מתנות, שורה ' + (i + 1) + ': ' + err); }
  }
  if (sent.length) log((dryRun ? 'dry ' : '') + 'giftNurture: ' + sent.join(', '));
  return sent;
}
function giftNurture(dryRun) { return giftSeries_(dryRun); }
// בדיקה מהעורך: שולח לגילעד את מייל המתנה וכל מיילי הסדרה של כל דף (כ-30 מיילים, פעם אחת)
function testSendGifts() {
  Object.keys(MATANA).forEach(function (slug) {
    sendGiftEmail('גילעד', CFG.OWNER_EMAIL, 'test', 'כן', slug);
    GIFT_STEPS.forEach(function (s) {
      var m = giftMail(slug, s[0]);
      giftSend(CFG.OWNER_EMAIL, '[דוגמה ' + slug + ' ' + s[0] + '] ' + m[0], wrapGift(m[1].replace(/\{שם\}/g, 'גילעד'), unsubLink('test'), slug));
    });
  });
}
// בדיקה מהעורך: מדמה שליחת טופס מדף מתנה
function testPostGift() {
  return doPost({ parameter: { 'שם': 'בדיקה – Claude', 'email': CFG.OWNER_EMAIL, 'מקור': 'מתנה: roe', 'utm_source': 'test', 'utm_content': 'x', 'מאשר/ת קבלת עדכונים': 'כן' } }).getContent();
}

// ---------- הודעה לגילעד ----------
function notifyOwner(row, dup) {
  var name = row[C['שם']], phone = row[C['טלפון']], email = row[C['מייל']], due = row[C['מועד לידה']], city = row[C['עיר']], source = row[C['מקור']];
  var line = (/^מתנה:/.test(String(source)) ? '🎁 ליד ממתנה: ' : /^כלים: שיפור/.test(String(source)) ? '💡 הצעה לשיפור כלי: ' : /^כלים: משפחת הכלים/.test(String(source)) ? 'הצטרפות למשפחת הכלים: ' : dup ? 'ליד חוזר: ' : 'ליד חדש: ') + name + (city ? ' · ' + city : '') + (due ? ' · ' + dueLabel(due) : '');
  var body = line + '\nטלפון: ' + phone + '\nמייל: ' + email + '\nמקור: ' + source +
    (phone ? '\n\nווטסאפ מוכן:\n' + waLink(phone, /^(כלים:|מתנה:)/.test(String(source)) ? 'שלום ' + String(name).split(' ')[0] + ', כאן גילעד מהכלים של גילעד רחמים. תודה שכתבת לי! ' : waMessage('WA-1', row)) : '') +
    '\n\nהגיליון: ' + SpreadsheetApp.getActive().getUrl();
  MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: line, body: body, name: 'האתר – לידים' });
  push(line, 'טלפון ' + phone + (email ? ' · ' + email : ''));
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
// טקסט שמתחיל ב-= + - @ הגיליון מפרש כנוסחה (למשל IMAGE ששולחת נתונים החוצה) – גרש בהתחלה שומר אותו כטקסט
function sheetSafe(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
// שם שנכנס ל-HTML של מייל: בלי תגיות וקישורים שמישהו הקליד בטופס
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function firstName(name) { return esc(String(name).split(' ')[0]); }
// הגבלת קצב: עד 2 שליחות לאותו מייל/טלפון ב-6 שעות (המקסימום של CacheService)
function tooMany(who, max) {
  var key = 'rl:' + String(who).toLowerCase().slice(0, 100), cache = CacheService.getScriptCache();
  var n = parseInt(cache.get(key) || '0', 10);
  cache.put(key, String(n + 1), 21600);
  return n >= (max || 2);
}
// תקרה יומית למיילים להורים, כדי שהצפה של הטופס לא תגמור את מכסת ה-100 של Gmail
var DAILY_CAP = 40;
function underDailyCap() {
  var lock = LockService.getScriptLock(), props = PropertiesService.getScriptProperties();
  try { lock.waitLock(5000); } catch (e) { return true; }
  try {
    var key = 'day:' + Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd'), n = parseInt(props.getProperty(key) || '0', 10);
    props.setProperty(key, String(n + 1));
    return n < DAILY_CAP;
  } finally { lock.releaseLock(); }
}
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
