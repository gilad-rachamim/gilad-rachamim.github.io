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
            'סטטוס', 'שלב בסדרה', 'מייל הבא', 'ווטסאפ אחרון', 'טוקן', 'הערות', 'עמוד', 'utm', 'נשלח לאחרונה', 'שלב'];
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
    if (!name && isGift_(clean(p['מקור']))) name = 'ללא שם';   // דפי מתנה: רק המייל חובה
    if (!name || !(phone || email || shipur)) return txt('missing');
    if (shipur && !(phone || email)) { if (tooMany('anon-shipur', 20)) return txt('ok'); }  // עד 20 הצעות אנונימיות ב-6 שעות
    else if (tooMany(email || phone)) return txt('ok');   // אותו אדם שולח שוב ושוב – לא כותבים ולא שולחים
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
    if (gift) { row[C['שלב']] = 'ליד'; ensureStageCol_(sh); }   // עמודת השלב: ליד / קנה קטן / קנה גדול
    sh.appendRow(row.map(sheetSafe));
    sh.getRange(sh.getLastRow(), C['טלפון'] + 1).setNumberFormat('@').setValue(phone); // לשמור את ה-0 המוביל

    if (consent === 'כן' && gift) { sh.getRange(sh.getLastRow(), C['מייל הבא'] + 1).setValue(addDays(new Date(), 2)); }
    else if (consent === 'כן') { var nx = dueStep(row, new Date()).next; sh.getRange(sh.getLastRow(), C['מייל הבא'] + 1).setValue(nx ? nx[1] : ''); }
    // מייל לנרשם: מעל התקרה או כשנגמרה המכסה – השורה מסומנת "ממתין למייל" והריצה היומית משלימה (27.11.2026)
    var src = clean(p['מקור']);
    if (email && needsMail_(src)) {
      var late = '';
      if (underDailyCap() && MailApp.getRemainingDailyQuota() > 2) {
        try { sendLeadMail_(name, email, token, consent, src); }
        catch (eM) { late = MailApp.getRemainingDailyQuota() < 1 ? PENDING : 'מייל נכשל'; log('מייל לנרשם נכשל: ' + eM + ' | ' + email); }
      } else late = PENDING;
      if (late) sh.getRange(sh.getLastRow(), C['הערות'] + 1).setValue(addNote_(row[C['הערות']], late));
    }
    try { notifyOwner(row, dup); } catch (eO) { log('התראה לגילעד נכשלה: ' + eO); }
    if (!kelim && !gift && isGuideLead_(clean(p['מקור']))) {        // ליד של המדריך → אנשי הקשר של גילעד (לא מפיל את הטופס אם נכשל)
      try { saveLeadContact_({ name: name, phone: phone, email: email, due: row[C['מועד לידה']], city: row[C['עיר']], date: row[C['תאריך']] }, contactKeys_()); }
      catch (eC) { log('שמירת איש קשר נכשלה: ' + eC + ' | ' + name); }
    }
    return txt('ok');
  } catch (err) {
    log('doPost error: ' + err + ' | ' + JSON.stringify(p));
    try { if (!tooMany('err-mail', 3)) MailApp.sendEmail(CFG.OWNER_EMAIL, 'שגיאה בצינור הלידים', String(err) + '\n\n' + JSON.stringify(p)); } catch (e2) {}
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
  var h = path.split('#'); // התגיות לפני ה-# (אחרת הן נבלעות בעוגן)
  var url = /^https?:/.test(path) ? path : CFG.SITE + h[0] + (h[0].indexOf('?') > -1 ? '&' : '?') + 'utm_source=email&utm_medium=nurture&utm_campaign=' + code + (h[1] ? '#' + h[1] : '');
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
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + shorten(inner) +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">' + SIG + '</div>' +
    (unsubUrl ? '<div style="margin-top:10px;font-size:12px;color:#999">קיבלתם את המייל כי ביקשתם את המדריך באתר וסימנתם שתרצו טיפים. לא רוצים יותר? <a href="' + unsubUrl + '" style="color:#999">להסרה בלחיצה אחת</a> – ואני עדיין כאן לכל שאלה.</div>' : '') +
    '</div>';
}
// קישורים קצרים: כל קישור מוכר (באתר או ב-Payhip) -> hakelim.com/go/e/<שם>/?c=<קוד>. הטבלה נכתבת ע"י tools/go_short.py
var GOE = {"/mohel/":"mohel","/mohel/#shira":"shira","/mohel/madrich/":"madrich","/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf":"pdf","/mohel/kartis/gilad-rachamim-mohel.vcf":"kartis","/mohel/moed/":"moed","/mohel/checklist/":"checklist","/mohel/hazmana/":"hazmana","/mohel/hazmana/?k=zeved":"zeved","/mohel/hazmana/?k=pidyon":"hazmana-pidyon","/mohel/shirim/":"shirim","/mohel/hachana/yom/":"yom","/mohel/hachana/achrei/":"achrei","/mohel/hachana/pidyon/":"pidyon","/kelim/":"kelim","/kelim/eruim/ishurim/":"ishurim","/kelim/shemot/banim/":"shemot","/kelim/yutub-bli-pirsomot/":"yutub","/kelim/chalufot-chinam/":"chalufot","/kelim/tamlul/":"tamlul","/claude-kvutza/":"kvutza","/kelim/claude/kurs/":"kurs-claude","/kelim/claude/shutafim/":"shutafim","/matana/kelim/asara/":"asara","/kelim/mismachim-leroe-cheshbon/":"mismachim","/assets/mismachim-leroe-cheshbon.pdf":"mismachim-pdf","/kelim/mah-magia-leoved-sheputar/":"sheputar","/assets/mah-magia-leoved-sheputar.pdf":"sheputar-pdf","/assets/mohel-mapat-derech.pdf":"mapa","/kesef/hechzer/":"hechzer","/kelim/cheshbon/mikdamot/":"mikdamot","/kesef/bruto-neto/":"neto","/kesef/zchuyot-pitorin/":"zchuyot","/kesef/pitzuyim-pitorin/":"pitzuyim","/kesef/pitzuyim-shaati/":"shaati","/kesef/hodaa-mukdemet/":"hodaa","/kesef/pidyon-chufsha/":"chufsha","/kesef/dmey-havraa/":"havraa","/kesef/shaot-nosafot/":"shaot","/kesef/tlush/":"tlush","/esek/tafrit/":"tafrit","/esek/qr/":"qr","/esek/tmchur-mana/":"tmchur","/esek/mivtza/":"mivtza","/esek/hazmana-vatsap/":"vatsap","/kelim/tochen/":"tochen","/kelim/tochen/tirgum/":"tirgum","/kelim/tochen/hakraa/":"hakraa","/kelim/tochen/chaye/":"chaye","/kelim/tochen/mail/":"nisuach","/kelim/machshev/chatima/":"chatima","/kelim/machshev/fax/":"fax","/kelim/machshev/sader/":"sader","/kelim/briut/tizkorot/":"tizkorot","/kodesh/mohalim/":"mohalim","/kodesh/kartis-mohel/":"kartis-mohel","/matana/roe/shidrug/":"shidrug-roe","/matana/orchei-din/shidrug/":"shidrug-din","/matana/esek/shidrug/":"shidrug-esek","/matana/kelim/shidrug/":"shidrug-kelim","/matana/claude/shidrug/":"shidrug-claude","/matana/mohel-kurs/shidrug/":"shidrug-mohel","https://payhip.com/b/M5xC6":"p-m5xc6","https://payhip.com/b/8utXB":"p-8utxb","https://payhip.com/b/bPiCF":"p-bpicf","https://payhip.com/b/kNyeO":"p-knyeo","https://payhip.com/b/jaDfg":"p-jadfg","https://payhip.com/b/2sQ9Y":"p-2sq9y","https://payhip.com/b/uYQyE":"p-uyqye","https://payhip.com/b/08VGv":"p-08vgv","https://payhip.com/b/DI9mU":"p-di9mu"};
function shortUrl(url) {
  var u = url.replace(/&amp;/g, '&'), hash = '', i = u.indexOf('#');
  if (i > -1) { hash = u.slice(i); u = u.slice(0, i); }
  var q = u.split('?'), keep = [], utm = {};
  (q[1] ? q[1].split('&') : []).forEach(function (p) { var m = p.match(/^utm_(\w+)=(.*)$/); if (m) utm[m[1]] = m[2]; else keep.push(p); });
  var key = q[0].replace(CFG.SITE, '') + (keep.length ? '?' + keep.join('&') : '') + hash;
  if (!GOE.hasOwnProperty(key)) return url; // יעד שלא בטבלה נשאר כמו שהוא
  var c = utm.source === 'madrich' ? 'm' : utm.source === 'youtube-guide' ? 'y' : utm.campaign ? utm.campaign + (utm.content ? '.' + utm.content : '') : '';
  return CFG.SITE + '/go/e/' + GOE[key] + '/' + (c ? '?c=' + c : '');
}
function shorten(html) { return html.replace(/href="(https:\/\/(?:hakelim|payhip)\.com[^"]*)"/g, function (m, u) { return 'href="' + shortUrl(u) + '"'; }); }
function toText(html) {
  // בטקסט הפשוט הקישור גלוי: ווטסאפ בלי ההודעה המוכנה הארוכה (בכפתור היא נשארת)
  html = html.replace(/(href="https:\/\/wa\.me\/\d+)\?text=[^"]*"/g, '$1"');
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
    '• <b>המדריך המלא להורים</b> – 17 עמודים, כולל כיבודים ופדיון הבן: ' + link(CFG.PDF_URL, 'להורדה (PDF)') + '<br><br>' +
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
  dryRun = dryRun === true;                               // טריגר זמן מעביר אובייקט אירוע
  if (!dryRun && isShabbatOrHoliday(new Date())) return;
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  var closed = { 'מוהל אחר': 1, 'לא רלוונטי': 1 }, sent = [], first_ = [];
  if (!dryRun) {
    SERIES_LEFT = SERIES_BUDGET;
    try { queueMissed_(); } catch (eQ) { log('queueMissed: ' + eQ); }
    try { first_ = catchUp_(); } catch (eU) { log('catchUp: ' + eU); }
  }
  try { first_ = first_.concat(buyerNurture(dryRun)); } catch (eB) { log('buyerNurture: ' + eB); }
  var data = sh.getDataRange().getValues(), today = new Date();
  for (var i = 1; i < data.length && sent.length < 40; i++) {
    var r = data[i];
    if (isGift_(r[C['מקור']])) continue;                  // לדפי המתנה יש סדרה משלהם (giftNurture)
    if (String(r[C['הערות']] || '').indexOf(PENDING) > -1) continue;
    if (r[C['הסכמה לדיוור']] !== 'כן' || !r[C['מייל']] || closed[r[C['סטטוס']]] || r[C['שלב בסדרה']] === 'done') continue;
    var lastSent = r[C['נשלח לאחרונה']];
    var ds = dueStep(r, today);
    if (!ds.step) { sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(ds.next ? ds.next[1] : ''); continue; }
    if (ds.step[0] !== 'E1' && lastSent instanceof Date && addDays(lastSent, 5) > today) continue; // מרווח 5 ימים
    if (ds.step[0] === 'E-post' && !REVIEW_URL()) continue; // מחכה לקישור הביקורת של Google Business
    var first = firstName(r[C['שם']]);
    var html = wrapHtml(mailBody(ds.step[0], ds.step[2]).replace(/\{שם\}/g, first), unsubLink(r[C['טוקן']]));
    if (dryRun) { sent.push((i + 1) + ':' + ds.step[0]); continue; }
    if (!takeSeries_()) break;
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
  if (!dryRun) { try { ownerDigest_(); } catch (eD) { log('ownerDigest: ' + eD); } }
  return first_.concat(sent);
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
  dryRun = dryRun === true;                               // טריגר זמן מעביר אובייקט אירוע
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
var MATANA = {"roe": {"gifts": [["מדריך: אילו מסמכים להביא לרואה חשבון", "/kelim/mismachim-leroe-cheshbon/", "גם כקובץ PDF להדפסה: /assets/mismachim-leroe-cheshbon.pdf"], ["מחשבון החזר מס", "/kesef/hechzer/", "בדיקה בשניות כמה אפשר לקבל בחזרה"], ["מחשבון מקדמות מס הכנסה", "/kelim/cheshbon/mikdamot/", "כמה לשלם בכל חודש"], ["מחשבון ברוטו-נטו", "/kesef/bruto-neto/", "מהמשכורת ברוטו לנטו"]]}, "orchei-din": {"gifts": [["מדריך: מה מגיע לעובד שפוטר", "/kelim/mah-magia-leoved-sheputar/", "גם כקובץ PDF להדפסה: /assets/mah-magia-leoved-sheputar.pdf"], ["זכויות בפיטורין ובהתפטרות", "/kesef/zchuyot-pitorin/", "מה מגיע ומתי"], ["פיצויי פיטורין", "/kesef/pitzuyim-pitorin/", "חישוב לפי ותק ושכר"], ["פיצויים לעובד שעתי", "/kesef/pitzuyim-shaati/", "כשהשכר לפי שעה"], ["הודעה מוקדמת", "/kesef/hodaa-mukdemet/", "כמה ימים מגיעים"], ["פדיון חופשה", "/kesef/pidyon-chufsha/", "כמה שווים ימי החופשה שנשארו"], ["דמי הבראה", "/kesef/dmey-havraa/", "הסכום לפי ותק"], ["שעות נוספות", "/kesef/shaot-nosafot/", "125% ו-150% בחישוב אחד"]]}, "esek": {"gifts": [["תפריט דיגיטלי עם QR", "/esek/tafrit/", "מקלידים מנות, בוחרים צבע ומדפיסים שלט"], ["יוצר קוד QR", "/esek/qr/", "קוד QR לכל קישור, להורדה"], ["תמחור מנה", "/esek/tmchur-mana/", "עלות, מחיר מומלץ ורווח חודשי"], ["מודעת מבצע לסטטוס", "/esek/mivtza/", "מודעה מוכנה לשיתוף"], ["הזמנות בווטסאפ עם QR", "/esek/hazmana-vatsap/", "לקוחות מזמינים אליכם ישר"]]}, "kelim": {"gifts": [["תמלול הקלטות", "/kelim/tamlul/", "הקלטה לטקסט בעברית"], ["תרגום", "/kelim/tochen/tirgum/", "תרגום טקסט ומסמכים"], ["הקראת טקסט בקול אנושי", "/kelim/tochen/hakraa/", "טקסט לקובץ שמע"], ["הנפשת תמונות", "/kelim/tochen/chaye/", "תמונה ישנה שמתחילה לזוז"], ["ניסוח מיילים", "/kelim/tochen/mail/", "נוסחים מוכנים לכל מצב"], ["חתימה על מסמכי PDF", "/kelim/machshev/chatima/", "בלי להדפיס ולסרוק"], ["פקס בחינם", "/kelim/machshev/fax/", "חלופה לפקס"], ["סידור תיקיות", "/kelim/machshev/sader/", "סדר בקבצים במחשב"], ["הבנת תלוש שכר", "/kesef/tlush/", "מה כתוב בכל שורה"], ["תזכורות", "/kelim/briut/tizkorot/", "תזכורות לתרופות ולמשימות"]]}, "claude": {"gifts": []}, "mohel-kurs": {"gifts": [["איך נהיים מוהל: מפת הדרך", "/assets/mohel-mapat-derech.pdf", "6 שלבים בקובץ אחד, להורדה"]]}};
var GIFT_STEPS = [['G1', 1], ['T2', 2], ['T3', 3], ['G2', 4], ['G3', 7], ['G4', 10], ['G5', 14]];
var CHESED = 'מיזם חסד, בחינם, בלי פרסומות ובלי כוונת רווח';
var PAY = { branded: 'https://payhip.com/b/M5xC6', kit: 'https://payhip.com/b/8utXB', digital: 'https://payhip.com/b/bPiCF', group: 'https://payhip.com/b/kNyeO' };
// מוצר זול לכל דף (39 ₪) – מתמלא בשלב ב' כשהמוצר חי ב-Payhip: { name: '', price: '39 ₪', url: '', what: ['..'] }
var CHEAP = {
  'roe': { name: 'ערכת דפי לקוח לרואה חשבון', price: '39 ₪', url: 'https://payhip.com/b/jaDfg', what: ['דפי לקוח מוכנים להדפסה ולשליחה', 'רשימת מסמכים, תזכורות והסברים', 'קבצי PDF ו-Word שאפשר לערוך'] },
  'orchei-din': { name: 'ערכת דפי לקוח לדיני עבודה', price: '39 ₪', url: 'https://payhip.com/b/2sQ9Y', what: ['דפי לקוח מוכנים למשרד', 'זכויות בפיטורין, טפסי איסוף מסמכים והסברים ללקוח', 'קבצי PDF ו-Word'] },
  'esek': { name: 'ערכת השקה לעסק', price: '39 ₪', url: 'https://payhip.com/b/uYQyE', what: ['30 פוסטים מוכנים בחמש קבוצות', 'מבצעים, הזמנות והכרות', 'לעריכה ולהדפסה'] },
  'kelim': { name: 'ערכת השקה לעסק', price: '39 ₪', url: 'https://payhip.com/b/uYQyE', what: ['30 פוסטים מוכנים בחמש קבוצות', 'מבצעים, הזמנות והכרות', 'לעריכה ולהדפסה'] },
  'mohel-kurs': { name: 'תיק המוהל', price: '97 ₪', url: 'https://payhip.com/b/08VGv', what: ['ערכה מסודרת למוהל בתחילת הדרך'] }
};
// ערך כל מוצר (₪) לפי מזהה Payhip – קובע אם הקונה "קנה קטן" או "קנה גדול"
var PRODUCT_VALUE = { 'jaDfg': 39, '2sQ9Y': 39, 'uYQyE': 39, 'kNyeO': 18, '08VGv': 97, 'M5xC6': 290, '8utXB': 590, 'bPiCF': 990, 'mXida': 147, 'DI9mU': 597 };
function ensureStageCol_(sh) {
  if (sh.getRange(1, C['שלב'] + 1).getValue() !== 'שלב') sh.getRange(1, C['שלב'] + 1).setValue('שלב');
}
// מסמנים קונה: סטטוס "קנה" (מפסיק את סדרת הלידים), שלב "קנה קטן" או "קנה גדול". product = מזהה Payhip או מחיר
function markBuyer(email, product) {
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS);
  ensureStageCol_(sh);
  var val = PRODUCT_VALUE[product] || Number(product) || 0, stage = val >= 147 ? 'קנה גדול' : product === 'kNyeO' ? 'קנה קבוצה' : 'קנה קטן';
  var data = sh.getDataRange().getValues(), n = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][C['מייל']]).toLowerCase() !== String(email).toLowerCase()) continue;
    sh.getRange(i + 1, C['סטטוס'] + 1).setValue('קנה');
    sh.getRange(i + 1, C['שלב'] + 1).setValue(stage);
    sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(new Date());
    sh.getRange(i + 1, C['שלב בסדרה'] + 1).setValue('');
    n++;
  }
  log('markBuyer ' + email + ' ' + product + ' -> ' + stage + ' (' + n + ' שורות)');
  return n;
}
// דוח לרב צדוק: כמה לידים הגיעו לדף קורס המוהלים לפי מקור (utm), ושולח לגילעד. לא נשלח לאף אחד אחר
function tzadokReport() {
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS), data = sh.getDataRange().getValues(), by = {}, tot = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][C['מקור']]) !== 'מתנה: mohel-kurs') continue;
    var u = String(data[i][C['utm']] || '').match(/utm_campaign=([^&]*)/); var k = u ? u[1] : 'ישיר';
    by[k] = (by[k] || 0) + 1; tot++;
  }
  var lines = Object.keys(by).map(function (k) { return k + ': ' + by[k]; });
  MailApp.sendEmail(CFG.OWNER_EMAIL, 'דוח קורס המוהלים: ' + tot + ' לידים', lines.join(String.fromCharCode(10)) || 'עדיין אין לידים');
  return tot;
}
// ---------- הוראות "יוטיוב בלי פרסומות" (דף כלים, 24.11.2026): מייל אחד, בלי סדרה ובלי מדריך ברית ----------
function ytLink_(path, label) {
  var url = /^https?:/.test(path) ? path : CFG.SITE + path + '?utm_source=youtube-guide&utm_medium=email&utm_campaign=youtube-bli-pirsomot';
  return '<a href="' + url + '" style="color:#1a5fb4;font-weight:bold">' + label + '</a>';
}
function sendYoutubeEmail(name, email) {
  var first = firstName(name);
  var inner = 'שלום ' + first + ',<br><br>הנה ההוראות לשמוע שירים ביוטיוב בלי פרסומות, גם ברקע ועם מסך כבוי, בדפדפן Brave (חינמי וחוקי):<br><br>' +
    '<b>באנדרואיד (נבדק אצלנו):</b><br>1. מורידים את Brave מגוגל פליי.<br>2. הגדרות ← מדיה ← מוודאים ש"ניגון ברקע" דלוק.<br>3. פותחים את ' + ytLink_('https://www.youtube.com/', 'יוטיוב') + ' ב-Brave, מנגנים שיר, ויוצאים למסך הבית או נועלים את המסך.<br>4. לחלון קטן צף: לוחצים על כפתור החלון הקטן שבסרגל הכתובת של Brave.<br>5. רוצים סמל כמו אפליקציה? שלוש הנקודות ← התקנה ויצירת קיצור דרך ← יצירת קיצור דרך.<br><br>' +
    '<b>באייפון:</b> מורידים את Brave מהאפ סטור ופותחים בו את youtube.com. את האייפון עוד לא בדקנו בעצמנו, אז ייתכן שחלק מהשלבים שונים.<br><br>' +
    '<b>במחשב:</b> מורידים את Brave מ-brave.com, והחוסם כבר מובנה.<br><br>' +
    'כל ההוראות, עם כפתור פתיחה ישר ב-Brave: ' + ytLink_('/kelim/yutub-bli-pirsomot/', 'לדף ההוראות') + '<br><br>' +
    'בשביל ההגינות: זה לא "פרימיום בחינם". אין הורדת שירים לשמיעה בלי אינטרנט, ומנוי הפרימיום של יוטיוב תומך ישירות ביוצרים. הדף שלנו לא קשור ליוטיוב, לגוגל או ל-Brave.<br><br>' +
    'עוד בחינם: ' + ytLink_('/kelim/chalufot-chinam/', 'חלופות חינמיות למנויים בתשלום') + ' · ' + ytLink_('/kelim/tamlul/', 'תמלול בעברית') + ' · ' + ytLink_('/kelim/', 'כל הכלים') + '<br><br>' +
    '<b>נ.ב.</b> את הדף הזה ואת כל האתר בניתי עם Claude, בלי להיות מתכנת במקצועי. מי שרוצה ללמוד איך: ' + ytLink_('/claude-kvutza/', 'קבוצת ליווי ב-18 ₪') + ' או ' + ytLink_('/kelim/claude/kurs/', 'הקורס המלא') + '. ומי שרוצה להפיץ ולקבל חצי מכל מכירה: ' + ytLink_('/kelim/claude/shutafim/', 'תוכנית השותפים') + '.<br><br>' +
    'שיהיה לכם בהצלחה,<br>גילעד';
  var html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + shorten(inner) +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">גילעד רחמים אביעד · הכלים של גילעד רחמים · ' + CHESED + '<br>hakelim.com/kelim</div></div>';
  MailApp.sendEmail({ to: email, subject: 'ההוראות: יוטיוב בלי פרסומות, גם ברקע ועם מסך כבוי', htmlBody: html, body: toText(html), name: CFG.OWNER_NAME, replyTo: CFG.OWNER_EMAIL });
}
// מנהלים שעברו למעקב: סטטוס "קנה" = סדרת הקונים (בלי הצעות)
function isGift_(src) { return /^מתנה:/.test(String(src || '')); }
function giftSlug_(src) { return String(src || '').replace(/^מתנה:\s*/, '').trim(); }
function pUrl(url, slug, code) { return url + (url.indexOf('?') > -1 ? '&' : '?') + 'utm_source=email&utm_medium=nurture&utm_campaign=matana-' + slug + '-' + code; }
function gBtn(url, label, green) {
  return '<a href="' + url + '" style="display:inline-block;background:' + (green ? '#1faa59' : '#e8b94a') + ';color:' + (green ? '#fff' : '#2a1f05') + ';font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px;margin:6px 0">' + label + '</a>';
}
function gWa(slug, text, label) { return gBtn('https://wa.me/' + CFG.WA_INTL + '?text=' + encodeURIComponent(text), label || 'שאלה? כתבו לי בווטסאפ', true); }
function wrapGift(inner, unsub, slug, pre) {
  return (pre ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + pre + '</div>' : '') + '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#222;max-width:560px">' + shorten(inner) +
    '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:13px;color:#666">גילעד רחמים אביעד · הכלים של גילעד רחמים · ' + CHESED + '<br><a href="https://wa.me/' + CFG.WA_INTL + '">058-404-9049 (ווטסאפ)</a> · hakelim.com</div>' +
    (unsub ? '<div style="margin-top:10px;font-size:12px;color:#999">קיבלתם את המייל כי ביקשתם מתנה באתר וסימנתם שתרצו טיפים וכלים. לא רוצים יותר? <a href="' + unsub + '" style="color:#999">להסרה בלחיצה אחת</a>.</div>' : '') +
    '</div>';
}
function giftSend(email, subject, html, slug) {
  // משפך קלוד נשלח מתיבת הכלים, בשם "גילעד רחמים – לומדים קלוד"
  var nm = slug === 'claude' ? 'גילעד רחמים – לומדים קלוד' : CFG.OWNER_NAME;
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: toText(html), name: nm, replyTo: CFG.OWNER_EMAIL });
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
  'mohel-kurs': ['מפת הדרך למוהל, כמו שביקשתם', 'מפת הדרך "איך נהיים מוהל", מוכנה. אפשר להוריד ולשמור:'],
  'claude': ['12 הפרומפטים ל-Claude, כמו שביקשתם', 'הנה 12 הפרומפטים. מעתיקים, מחליפים את מה שבסוגריים מרובעים, ומדביקים:'],
  'kelim': ['10 הכלים החינמיים, כמו שביקשתם', 'הנה עשרת הכלים הכי שימושיים באתר, מסודרים לפי תחום. הכל בחינם ובלי הרשמה:']
};
function sendGiftEmail(name, email, token, consent, slug) {
  var m = MATANA[slug], h = GIFT_HEAD[slug];
  if (!m || !h) { log('מתנה: דף לא מוכר ' + slug); return; }
  var inner = gHello(name) + ',<br><br>תודה שביקשתם. ' + h[1] + '<br><br>';
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
    (consent === 'כן' ? '<b>מחר מתחילים:</b> שלושה ימים, כל יום הדרכה קצרה על ' + (slug === 'claude' ? 'פרומפט אחד, איך משתמשים בו נכון' : slug === 'mohel-kurs' ? 'שלב אחד בדרך' : 'כלי אחד, איך מפעילים אותו בשלושה צעדים') + '. אחר כך, מדי כמה ימים, טיפ או הצעה. אפשר להפסיק בכל רגע.<br><br>' : '') +
    'בברכה,<br>גילעד';
  giftSend(email, h[0], wrapGift(inner, consent === 'כן' ? unsubLink(token) : '', slug), slug);
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
  'mohel-kurs': {
    G1: ['הצעד הראשון: לשמוע מוהל שכבר בדרך', 'לפני כל לימוד, שווה לשוחח עם מוהל אחד שעבר את הדרך ולשאול אותו איך נראה יום עבודה אמיתי. כל הכלים שבניתי למוהלים פתוחים לכם בחינם, ואפשר להתחיל להכיר אותם מהיום.', '/kodesh/mohalim/', 'הכלים בחינם למוהלים'],
    G4: ['הורים בוחרים מוהל שהם סומכים עליו', 'הורים לא מתחרים על מחיר אלא על אמון. שיחה חמה לפני הברית וטלפון אחריה בונים אותו. הכרטיס הדיגיטלי למוהלים חוסך את כל החיפוש.', '/kodesh/kartis-mohel/', 'הכרטיס הדיגיטלי למוהלים']
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
var TUT = {"claude": {"G1": {"subj": ["יום 1: הפרומפט שחוסך שעה של תיקונים", "לפני שClaude כותב – שיִשאל אתכם", "הדרכה קצרה: \"שאל אותי קודם\""], "pre": "שלושה צעדים, חמש דקות, ותוצאה הרבה יותר מדויקת", "intro": "היום, הפרומפט הראשון מהרשימה, וגם הכי חשוב: לבקש מ-Claude לשאול אתכם לפני שהוא מתחיל. רוב התוצאות הבינוניות נולדות מזה שהוא ניחש מה רציתם.", "steps": ["פותחים שיחה חדשה ב-Claude.", "מדביקים: \"אני רוצה לבנות [מה]. לפני שאתה כותב קוד, שאל אותי עד 5 שאלות שיעזרו לך להבין מה אני צריך.\" ומחליפים את [מה] במה שאתם רוצים.", "עונים על השאלות שלו בקצרה, ורק אז כותבים: \"עכשיו תבנה\"."], "ex": "\"אני רוצה לבנות רשימת קניות שמתחלקת בין בני הבית\". Claude ישאל כמה אנשים, האם מהטלפון, והאם צריך לסמן מה נקנה, ויבנה בדיוק את זה.", "url": "/claude-kvutza/", "cta": "לפתוח את כל הפרומפטים"}, "T2": {"subj": ["יום 2: מה עושים כשמשהו נשבר", "שגיאה? זה הפרומפט", "\"זה עבד אתמול\" – ואיך מתקנים"], "pre": "להדביק את השגיאה כמו שהיא, ולקבל הסבר בשפה פשוטה", "intro": "היום, הרגע שכולם נתקעים בו: משהו הפסיק לעבוד. לא צריך להבין את השגיאה, רק להעביר אותה ל-Claude נכון.", "steps": ["מעתיקים את הודעת השגיאה בדיוק כמו שהיא, בלי לקצר.", "כותבים: \"קיבלתי את השגיאה הזו: [הדבק כמו שהיא]. הסבר מה קרה בשפה פשוטה, ותתקן.\"", "אם עבד ופתאום לא: \"זה עבד אתמול ועכשיו לא. מה שינינו מאז? תציע 3 סיבות אפשריות לפי סדר סבירות.\""], "ex": "דף שנראה טוב במחשב ושבור בטלפון: \"הדף נראה רע בטלפון. תתאים אותו למסך צר בלי לשבור את המחשב.\"", "url": "/claude-kvutza/", "cta": "לפתוח את פרומפטי התיקון"}, "T3": {"subj": ["יום 3: לעבוד חכם, בלי סבבים מיותרים", "שתי שורות שחוסכות חצי מהעבודה", "איך ממשיכים מחר בדיוק מאיפה שעצרתם"], "pre": "לבקש הסבר לפני שינוי, וסיכום בסוף כל יום", "intro": "היום, שני הרגלים קטנים שמבדילים בין מי שנתקע לבין מי שמתקדם: לאשר לפני שינוי, ולסכם לפני שהולכים.", "steps": ["לפני כל שינוי גדול: \"לפני שתשנה משהו, תסביר מה אתה מתכוון לשנות ולמה, ותחכה לאישור שלי.\"", "בסוף העבודה: \"תסכם לי בחמש שורות מה עשינו עד עכשיו ומה נשאר, כדי שאמשיך מחר.\"", "שומרים את הסיכום, ומחר מדביקים אותו בשיחה חדשה כהודעה הראשונה."], "ex": "ביקשתם \"לשפר את העיצוב\"? עם השורה הראשונה Claude יגיד קודם מה הוא מתכנן, ותוכלו לעצור אותו לפני שהוא משנה את מה שכבר אהבתם.", "url": "/claude-kvutza/", "cta": "לפתוח את פרומפטי העבודה החכמה"}}, "mohel-kurs": {"G1": {"subj": ["יום 1: איך קוראים את מפת הדרך", "מאיפה מתחילים? מהשלב הראשון במפה", "שלוש שאלות לפני שמתחילים ללמוד"], "pre": "לשמור את הקובץ, לקרוא את שלב 1, ולסמן איפה אתם", "intro": "תודה שהורדתם את מפת הדרך. היום רק צעד אחד, בנחת: להבין איפה אתם עומדים בדרך, לפני שמחליטים על כל לימוד.", "steps": ["שומרים את הקובץ בטלפון, כדי שיהיה תמיד בהישג יד.", "קוראים את \"שלב 1: להבין מה המקצוע באמת\", ועונים לעצמכם בכנות על השאלות שבו.", "מסמנים באיזה מששת השלבים אתם נמצאים היום. זו נקודת ההתחלה שלכם."], "ex": "מי שעדיין לא ראה ברית מקרוב, מתחיל משלב 1 ומשיחה עם מוהל ותיק. מי שכבר לומד, קופץ ישר לשלב 3.", "url": "/assets/mohel-mapat-derech.pdf", "cta": "לפתוח את מפת הדרך"}, "T2": {"subj": ["יום 2: כלי העבודה שמחכים לכם כבר עכשיו", "שלב 5 במפה: הכלים מוכנים", "יומן בריתות, טופס פרטים והודעות להורים – בחינם"], "pre": "כל הכלים למוהלים בדף אחד, בלי הרשמה", "intro": "בשלב 5 של מפת הדרך כתבתי שכלי העבודה כבר מוכנים. היום שווה להכיר אותם, עוד לפני הברית הראשונה, כדי שביום האמיתי הכל יהיה מוכר.", "steps": ["פותחים את דף הכלים למוהלים.", "פותחים את \"יומן הבריתות שלי\" ורושמים ברית לדוגמה. הכל נשמר רק אצלכם.", "בכלי \"טופס פרטי הברית\" לוחצים \"להכין קישור אישי\", ורואים איך ההורים ישלחו לכם את כל הפרטים בווטסאפ."], "ex": "בדף יש גם \"הודעות החלמה להורים\" ו\"לוח בריתות מיוחדות\" לכל השנה, שימושיים מהיום הראשון.", "url": "/kodesh/mohalim/", "cta": "לפתוח את הכלים למוהלים"}, "T3": {"subj": ["יום 3: כרטיס ביקור דיגיטלי, בשלוש דקות", "איך הורים ישמרו אתכם באנשי הקשר", "הכרטיס הדיגיטלי למוהל – מכינים פעם אחת"], "pre": "ממלאים פעם אחת ומקבלים קישור ותמונה עם QR", "intro": "הורים בוחרים מוהל שהם סומכים עליו, ומחפשים את הטלפון שלו ברגע שהתינוק נולד. כרטיס דיגיטלי אחד עושה את זה פשוט.", "steps": ["פותחים את \"כרטיס ביקור דיגיטלי למוהל\".", "ממלאים שם, הסמכה, טלפון ועיר. נוסחים ושורה אישית לא חובה.", "לוחצים \"ליצור את הכרטיס שלי\", ושומרים גם את התמונה עם ה-QR."], "ex": "שמים את הקישור בפרופיל הווטסאפ ובחתימה, וכל מי שמקבל אותו שומר אתכם באנשי הקשר בלחיצה.", "url": "/kodesh/kartis-mohel/", "cta": "לבנות את הכרטיס שלי"}}, "roe": {"G1": {"subj": ["יום 1: רשימת המסמכים שחוסכת לכם טלפונים", "איך לקוח מביא את כל המסמכים בפעם הראשונה", "הדרכה קצרה: מדריך המסמכים לרואה חשבון"], "pre": "מדריך מוכן לשליחה ללקוחות, עם רשימת בדיקה להדפסה", "intro": "היום, הכלי הראשון מהמתנות: מדריך \"אילו מסמכים להביא לרואה חשבון\". הוא כתוב בשביל הלקוח, כדי שיגיע מוכן ולא ישאל אתכם שוב ושוב.", "steps": ["פותחים את המדריך ועוברים על \"רשימת המסמכים לדוח השנתי של עצמאי\".", "מורידים את ה-PDF (\"להורדת המדריך כ-PDF\") או מדפיסים את רשימת הבדיקה.", "שולחים ללקוחות חדשים לפני הפגישה הראשונה, ולכולם בתחילת עונת הדוחות."], "ex": "לקוח חדש מקבל את הקישור יום לפני הפגישה, ומגיע עם דפי בנק, חשבוניות ואישורי ניכוי במקור, במקום \"אשלח לך אחר כך\".", "url": "/kelim/mismachim-leroe-cheshbon/", "cta": "לפתוח את מדריך המסמכים"}, "T2": {"subj": ["יום 2: בדיקת החזר מס, בשתי דקות", "השאלה שכל לקוח שכיר שואל", "הדרכה קצרה: בדיקת החזר מס ללקוחות"], "pre": "12 שאלות קצרות, והלקוח יודע אם שווה לבדוק", "intro": "היום, כלי שאפשר לשלוח ללקוחות שכירים: \"בדיקת החזר מס\". הוא לא מחשב סכום, אלא מראה אם שווה לבדוק, ואילו מסמכים להכין.", "steps": ["פותחים את הכלי ועונים על השאלות: \"כן\", \"לא\" או \"לא בטוח\".", "רואים את התוצאה: \"שווה לבדוק\" עם הסיבות, ורשימת \"מסמכים להכין\".", "שולחים את הקישור ללקוח, והוא חוזר אליכם עם הסיבות והמסמכים מוכנים."], "ex": "לקוח שעבד אצל שני מעסיקים באותה שנה בלי תיאום מס יראה מיד \"שווה לבדוק\". התשובות נשמרות רק בטלפון שלו.", "url": "/kesef/hechzer/", "cta": "לפתוח את בדיקת ההחזר"}, "T3": {"subj": ["יום 3: מקדמות ומע\"מ, בסיכום אחד ללקוח", "סיכום מע\"מ ומקדמות שנשלח בווטסאפ", "הדרכה קצרה: מחשבון מקדמות ודוח מע\"מ"], "pre": "כמה לשלם, עד מתי, וסיכום מוכן לשליחה", "intro": "היום, הכלי שחוסך הכי הרבה שיחות טלפון: מחשבון מקדמות מס הכנסה ודוח מע\"מ. הוא מראה כמה לשלם, כמה מקדמה, ועד איזה תאריך.", "steps": ["בוחרים \"לקוח אחד\", את תקופת הדיווח, ו\"חודשי\" או \"דו-חודשי\".", "ממלאים עסקאות חייבות, מע\"מ תשומות ואחוז המקדמה של הלקוח.", "לוחצים \"להעתיק סיכום ללקוח\" או \"לשלוח בווטסאפ\"."], "ex": "במשרד עם הרבה לקוחות: \"כל הלקוחות מאקסל (למשרד)\", מדביקים טבלה ולוחצים \"לחשב לכל הלקוחות\".", "url": "/kelim/cheshbon/mikdamot/", "cta": "לפתוח את מחשבון המקדמות"}}, "orchei-din": {"G1": {"subj": ["יום 1: מדריך ללקוח שפוטר, לפני הפגישה", "איך לקוח מגיע לפגישה הראשונה עם כל המסמכים", "הדרכה קצרה: מה מגיע לעובד שפוטר"], "pre": "מדריך זכויות ורשימת מסמכים, מוכן לשליחה", "intro": "מידע כללי, לא ייעוץ משפטי. היום, הכלי הראשון מהמתנות: מדריך \"מה מגיע לעובד שפוטר\", עם רשימת מסמכים לפגישה עם עורך דין.", "steps": ["פותחים את המדריך ועוברים על \"רשימת מסמכים להביא לפגישה עם עורך דין\".", "מורידים את ה-PDF (\"להורדת המדריך כ-PDF\").", "שולחים ללקוח כשהוא קובע פגישה, כדי שיגיע עם תלושים, מכתב פיטורים וחוזה."], "ex": "בדף יש גם \"לפני שחותמים: 4 כללים פשוטים\", שכדאי שהלקוח יקרא עוד לפני שהוא חותם על משהו.", "url": "/kelim/mah-magia-leoved-sheputar/", "cta": "לפתוח את המדריך"}, "T2": {"subj": ["יום 2: מחשבון זכויות בפיטורין, בעמוד אחד", "פיצויים, הודעה מוקדמת, חופשה והבראה – יחד", "הדרכה קצרה: מחשבון זכויות בפיטורין"], "pre": "תאריכים ושכר, והתוצאה מתעדכנת תוך כדי מילוי", "intro": "מידע כללי, לא ייעוץ משפטי. היום, מחשבון שמראה בעמוד אחד פיצויי פיטורין, הודעה מוקדמת, פדיון חופשה ודמי הבראה.", "steps": ["בוחרים \"איך הסתיימה העבודה?\": פוטרתי, התפטרתי בדין מפוטר, או התפטרות רגילה.", "ממלאים תאריך תחילה, יום עבודה אחרון ושכר חודשי ברוטו אחרון.", "מוסיפים אם יש סעיף 14 וימי חופשה שנוצלו, והסכום הכולל מופיע מיד."], "ex": "לקוח ממלא לפני הפגישה ומגיע עם הערכה כללית, כך שהשיחה מתחילה מהשאלות החשובות. החישוב נעשה בדפדפן שלו.", "url": "/kesef/zchuyot-pitorin/", "cta": "לפתוח את מחשבון הזכויות"}, "T3": {"subj": ["יום 3: פיצויי פיטורין לשכר שעתי ומשתנה", "החישוב שמראה איך הגיע לכל מספר", "הדרכה קצרה: מחשבון פיצויי פיטורין"], "pre": "לעובד חודשי, שעתי או בשכר משתנה, עם הסבר לכל שלב", "intro": "מידע כללי, לא ייעוץ משפטי. היום, מחשבון פיצויי פיטורין מפורט: הוא מראה איך חושב כל שלב, ומתאים גם לשכר שעתי ולשכר משתנה.", "steps": ["ממלאים \"איך הסתיימה העבודה?\" ואת התאריכים.", "בוחרים \"איך משולם השכר?\": חודשי קבוע, לפי שעות, או משתנה (ממוצע 12 חודשים).", "מסמנים אם היקף המשרה השתנה ומתי התחילו הפרשות סעיף 14, וקוראים את פירוט החישוב."], "ex": "עובד שעתי שעבר מחצי משרה למשרה מלאה: מסמנים \"היקף המשרה השתנה\", והחישוב מתחשב בזה. שום מספר לא נשלח לשרת.", "url": "/kesef/pitzuyim-pitorin/", "cta": "לפתוח את מחשבון הפיצויים"}}, "esek": {"G1": {"subj": ["יום 1: תפריט דיגיטלי עם QR, בעשר דקות", "התפריט שלכם בקישור אחד ובקוד על השולחן", "הדרכה קצרה: תפריט דיגיטלי ו-QR"], "pre": "מקלידים מנות ומחירים, ומקבלים קישור וקוד להדפסה", "intro": "היום, הכלי הראשון מהמתנות: תפריט דיגיטלי. מקלידים מנות ומחירים, ומקבלים תפריט בקישור, לשליחה בווטסאפ ו-QR לשולחן.", "steps": ["ממלאים \"שם העסק\", ובשדה \"המנות והמחירים\" כותבים כל מנה כך: שם - מחיר.", "מוסיפים טלפון להזמנות, כתובת ושעות פתיחה (לא חובה).", "לוחצים \"ליצור קישור ו-QR\", ואחר כך \"QR לשולחן\" להדפסה."], "ex": "רוצים לראות איך זה נראה לפני שממלאים? לוחצים \"למלא דוגמה של פיצריה\". התפריט לא נשמר אצלי: הוא יושב בתוך הקישור.", "url": "/esek/tafrit/", "cta": "לבנות את התפריט"}, "T2": {"subj": ["יום 2: קוד QR מעוצב לעסק", "QR לווטסאפ, לוויפיי או לקישור – עם כותרת", "הדרכה קצרה: יצירת קוד QR מעוצב"], "pre": "בוחרים סוג, מוסיפים לוגו וכותרת, ומדפיסים", "intro": "היום, קוד QR מעוצב: לקוח סורק ומגיע ישר לווטסאפ שלכם, לוויפיי של העסק, או לכל קישור. הקוד לא פג, ואין הגבלה על מספר הסריקות.", "steps": ["בוחרים סוג: קישור, ווטסאפ, טלפון, וויפיי או טקסט, וממלאים את הפרטים.", "מוסיפים לוגו באמצע (לא חובה), כותרת מעל הקוד, ובוחרים עיצוב וגודל.", "לוחצים \"להדפיס\" או \"לשמור את התמונה\"."], "ex": "שלט ווטסאפ לדלפק עם הודעה מוכנה \"שלום, אשמח לפרטים\". טיפ: לסרוק פעם אחת מטלפון אחר לפני שמדפיסים הרבה.", "url": "/esek/qr/", "cta": "ליצור קוד QR"}, "T3": {"subj": ["יום 3: כמה באמת עולה לכם כל מנה", "המחיר שנשאר בכיס, לא רק המחיר בתפריט", "הדרכה קצרה: מחשבון תמחור מנה"], "pre": "רכיבים, אריזה ופחת, והמחיר הנכון למכירה", "intro": "היום, מחשבון תמחור מנה: הוא מראה כמה המנה עולה לכם, באיזה מחיר למכור אותה, וכמה נשאר בכיס.", "steps": ["כותבים \"שם המנה\", ובכל רכיב: מחיר, כמה באריזה וכמה במנה (\"+ עוד רכיב\" להוספה).", "ממלאים אריזה, פחת ואחוז עלות חומרי גלם רצוי.", "לוחצים \"לחשב את המנה\", ואפשר \"להעתיק את הסיכום\"."], "ex": "לוחצים \"למלא דוגמה של המבורגר\" ורואים את כל החישוב מוכן. הנתונים נשארים בטלפון שלכם.", "url": "/esek/tmchur-mana/", "cta": "לפתוח את מחשבון התמחור"}}, "kelim": {"G1": {"subj": ["יום 1: הקלטה הופכת לטקסט, מהטלפון", "תמלול הודעה קולית בפחות מדקה", "הדרכה קצרה: תמלול הקלטות בעברית"], "pre": "מעלים או מקליטים, ומקבלים טקסט לשמירה ולשליחה", "intro": "היום, הכלי שחוסך הכי הרבה זמן מתוך העשרה: תמלול הקלטות בעברית. הודעה קולית, שיחה, שיעור או סרטון הופכים לטקסט.", "steps": ["לוחצים \"לבחור קובץ מהטלפון\", או \"להקליט עכשיו\".", "בוחרים את שפת ההקלטה (עברית כברירת מחדל).", "כשהטקסט מוכן: \"להעתיק\", \"לשמור כוורד\" או \"לשלוח בווטסאפ\"."], "ex": "הודעה קולית ארוכה בווטסאפ הופכת לטקסט בפחות מדקה, ושיעור של שעה בכמה דקות. הקובץ לא נשמר בשרת.", "url": "/kelim/tamlul/", "cta": "לפתוח את התמלול"}, "T2": {"subj": ["יום 2: מתרגם עם קול, גם מתמונה ומסמך", "לתרגם פסקה שלמה, לא רק מילה", "הדרכה קצרה: תרגום מאנגלית לעברית ולהפך"], "pre": "לכתוב, לדבר, לצלם או להעלות מסמך, ולשמוע את התרגום", "intro": "היום, המתרגם: מאנגלית לעברית ולהפך, ומעוד 20 שפות. אפשר לכתוב, לדבר, לצלם או להעלות מסמך.", "steps": ["בוחרים \"מתרגמים מ\" ו\"מתרגמים ל\".", "כותבים טקסט, או לוחצים \"לדבר\", \"תמונה\" או \"מסמך\".", "לוחצים \"לתרגם\", ואז \"להקריא\" או \"להעתיק\"."], "ex": "מכתב באנגלית מהבנק: מצלמים אותו עם \"תמונה\" ומקבלים עברית. ב\"מצב שיחה\" אפשר לדבר עם מי שלא מדבר עברית.", "url": "/kelim/tochen/tirgum/", "cta": "לפתוח את המתרגם"}, "T3": {"subj": ["יום 3: מסמך שמקריאים לכם בקול אנושי", "להקשיב ל-PDF במקום לקרוא אותו", "הדרכה קצרה: הקראת טקסט בעברית"], "pre": "מעלים PDF או Word, ומקבלים הקראה וקובץ MP3", "intro": "היום, הקראת טקסט בעברית בקול אנושי: מעלים מסמך ומקשיבים לו בדרך, בהליכה או בעיניים עייפות.", "steps": ["לוחצים \"להעלות קובץ PDF או Word\", או מדביקים טקסט.", "בוחרים קול של גבר או של אישה, והקראה מלאה או סקירה קצרה.", "לוחצים \"המר לקובץ קול\", ואפשר \"להוריד כקובץ MP3\"."], "ex": "חוזר ארוך מבית הספר הופך לקובץ קול של כמה דקות. רק PDF עם טקסט עובד (לא סרוק), ולא כדאי להעלות מסמך סודי.", "url": "/kelim/tochen/hakraa/", "cta": "לפתוח את ההקראה"}}};
var GROUP_WHAT = '<ul><li>קבוצת ווטסאפ פרטית, עם גילעד כמנטור</li><li>ערכה של 30 פרומפטים ב-PDF</li><li>טיפ יומי ו"כלי היום"</li></ul>18 ₪ במחיר השקה (אחרי ההשקה: 29 ₪), תשלום חד-פעמי, בלי חיוב אוטומטי, ו-14 יום להחזר כספי.';
function tUrl(u, slug, step) {
  var day = { G1: 1, T2: 2, T3: 3, G2: 4, G3: 7, G4: 10, G5: 14 }[step] || 0;
  var url = /^https?:/.test(u) ? u : CFG.SITE + u;
  return url + (url.indexOf('?') > -1 ? '&' : '?') + 'utm_source=email&utm_medium=nurture&utm_campaign=matana-' + slug + '&utm_content=' + step + '-d' + day;
}
var ASK_LINE = 'יש שאלה על הפעלת הכלי? אני כאן – אפשר להשיב למייל הזה או לכתוב לי בווטסאפ.';
// מייל הדרכה: [נושא, גוף, שורת תצוגה מקדימה]
function tutMail(slug, step) {
  var t = TUT[slug] && TUT[slug][step]; if (!t) return null;
  var BR = '<br><br>', u = tUrl(t.url, slug, step);
  var body = 'שלום {שם},' + BR + t.intro + BR + '<b>' + (t.how || 'שלושה צעדים:') + '</b><ol style="padding-right:20px;margin:6px 0">' + t.steps.map(function (s) { return '<li style="margin:4px 0">' + s + '</li>'; }).join('') + '</ol>' +
    (t.ex ? '<b>דוגמה:</b> ' + t.ex + BR : '<br>') +
    '<div style="text-align:center">' + gBtn(u, t.cta).replace('display:inline-block', 'display:block;text-align:center') + '</div>' +
    '<div style="font-size:13px;color:#666;margin-top:4px">או בקישור: <a href="' + u + '">' + t.cta + '</a></div>' + BR +
    (slug === 'claude' ? ASK_LINE.replace('הפעלת הכלי', 'הפרומפטים') : slug === 'mohel-kurs' ? ASK_LINE.replace('יש שאלה על הפעלת הכלי?', 'יש שאלה על הדרך?') : ASK_LINE) +
    '<br>' + gWa(slug, 'שלום גילעד, שאלה על ' + t.cta.replace(/^לפתוח את |^לפתוח /, '') + ': ', 'לכתוב לי בווטסאפ') + BR + 'גילעד';
  return [t.subj[0], body, t.pre];
}
// יום 10 במשפכי העסקים: מסלול "לעשות לבד", הצעה אחת לקבוצת ה-18 ₪ (פעם אחת בלבד)
function groupOfferMail(slug, step) {
  var BR = '<br><br>', u = pUrl(PAY.group, slug, step);
  return ['אוהבים לעשות לבד? יש מסלול כזה', 'שלום {שם},' + BR + 'אולי אתם מהאנשים שאוהבים לעשות לבד. את כל הכלים ששלחתי לכם בניתי בעזרת Claude, ויש לי קבוצת ווטסאפ קטנה שבה אני מלמד בדיוק את זה, צעד אחר צעד:' + GROUP_WHAT + BR +
    gBtn(u, 'להצטרף לקבוצה, 18 ₪') + BR + 'זו הפעם היחידה שאציע את זה, ולא אחזור על כך. ואם זה לא בשבילכם, הכלים החינמיים נשארים שלכם כרגיל.' + BR + 'אני כאן לכל שאלה בווטסאפ או במייל.<br>גילעד', 'קבוצת ליווי קטנה, 18 ₪ במחיר השקה, 14 יום להחזר'];
}
var HARD_LINE = 'זה מיזם חסד, והמטרה שלי שהכלים יגיעו לכמה שיותר אנשים. אם התשלום קשה לכם כרגע, ענו למייל או כתבו לי בווטסאפ ואשלח לכם קופון הנחה אישי.';
function giftWho_(slug) { return slug === 'roe' || slug === 'orchei-din' ? 'המשרד' : 'העסק'; }
// מחזיר [נושא, גוף] לשלב מסוים של הסדרה
function giftMail(slug, step) {
  var v = GIFT_VALUE[slug], cheap = CHEAP[slug], who = giftWho_(slug), wa = function (t, l) { return gWa(slug, t, l); };
  var BR = '<br><br>', L = function (u, t) { return link(u, t, step); };
  var tm = tutMail(slug, step); if (tm) return tm;
  if (step === 'G4' && /^(roe|orchei-din|esek|kelim)$/.test(slug)) return groupOfferMail(slug, step);
  if (step === 'G4' && slug === 'mohel-kurs') step = 'G1';   // ההדרכות כבר כיסו את הכרטיס; ביום 10 – הטיפ על שיחה עם מוהל ותיק
  if (step === 'G1' || step === 'G4') {
    return [v[step][0], 'שלום {שם},' + BR + v[step][1] + BR + L(v[step][2], v[step][3]) + BR + 'אני כאן לכל שאלה בווטסאפ או במייל.<br>גילעד'];
  }
  if (slug === 'mohel-kurs') {
    var kb = function (u, l) { return gBtn(pUrl(u, slug, step), l); };
    if (step === 'G2') return ['תיק המוהל – 97 ₪', 'שלום {שם},' + BR + 'אם אתם בתחילת הדרך, הכנתי ערכה מסודרת: <b>תיק המוהל</b>. 97 ₪, תשלום חד-פעמי.' + BR + kb('https://payhip.com/b/08VGv', 'לפרטים על תיק המוהל'), ];
    if (step === 'G3') return ['הקורס המלא למוהלים, עם ליווי מעשי', 'שלום {שם},' + BR + 'מי שרוצה ללכת את כל הדרך, יש קורס מלא, כולל ליווי מעשי: תרגול על בובה, עד שהידיים בטוחות. 597 ₪, תשלום חד-פעמי.' + BR + kb('https://payhip.com/b/DI9mU', 'לפרטים על הקורס') + BR + wa('שלום גילעד, אני רוצה לשמוע על הקורס', 'שאלה? ווטסאפ'), ];
    return ['המייל האחרון בסדרה', 'שלום {שם},' + BR + 'זה המייל האחרון בסדרה. אם אתם שוקלים ללמוד להיות מוהל, אשמח לשיחת היכרות קצרה, בלי התחייבות.' + BR + wa('שלום גילעד, אני שוקל להיות מוהל', 'לכתוב לגילעד בווטסאפ') + BR + 'בברכה,<br>גילעד'];
  }
  if (slug === 'claude') {
    var grp = gBtn(pUrl(PAY.group, slug, step), 'אני רוצה להצטרף לקבוצה');
    var what = '<ul><li>קבוצת ווטסאפ פרטית, עם גילעד כמנטור</li><li>ערכה של 30 פרומפטים ב-PDF</li><li>טיפ יומי ו"כלי היום"</li></ul>18 ₪ במחיר השקה (אחרי ההשקה: 29 ₪), תשלום חד-פעמי, בלי חיוב אוטומטי, ו-14 יום להחזר כספי.';
    if (step === 'G2') return ['מקום לשאלות: קבוצת Claude עם מנטור', 'שלום {שם},' + BR + 'אחרי שניסיתם את הפרומפטים, בדרך כלל עולות שאלות: למה זה לא עבד, איך מתקדמים, מה עוד אפשר לבנות. בשביל זה יש קבוצה:' + what + BR + grp + BR + 'בברכה,<br>גילעד'];
    if (step === 'G3') return ['מה עושים בקבוצה בפועל', 'שלום {שם},' + BR + 'בקבוצה אני מעלה כל יום טיפ קצר וכלי אחד שאפשר להפעיל באותו יום, ואפשר לשאול אותי ישירות כשנתקעים. אין הרצאות ארוכות: רק דברים שעובדים.' + BR + what + BR + grp + BR + 'בברכה,<br>גילעד'];
    return ['המייל האחרון בסדרה: הקבוצה', 'שלום {שם},' + BR + 'זה המייל האחרון בסדרה. אם עדיין רוצים ללמוד לעבוד עם Claude יחד איתי, הקבוצה פתוחה:' + what + BR + grp + BR + 'ובכל מקרה, הפרומפטים שקיבלתם נשארים שלכם. בהצלחה!<br>גילעד'];
  }
  var b290 = gBtn(pUrl(PAY.branded, slug, step), 'לפרטים על כלי ממותג, 290 ₪');
  var hard = '<div style="font-size:14px;color:#555;border:1px dashed #ccc;border-radius:8px;padding:8px 10px">' + HARD_LINE + '</div>';
  if (step === 'G2') {
    if (cheap && cheap.url) return [cheap.name + ' – ' + cheap.price, 'שלום {שם},' + BR + 'הכנתי משהו שחוסך זמן ל' + who + ': <b>' + cheap.name + '</b>.<ul>' + cheap.what.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' + cheap.price + ' במחיר השקה' + (cheap.price === '39 ₪' ? ' (אחרי ההשקה: 59 ₪)' : '') + ', תשלום חד-פעמי, 14 יום להחזר כספי.' + BR + gBtn(pUrl(cheap.url, slug, step), 'לפרטים והורדה, ' + cheap.price) + BR + 'בברכה,<br>גילעד'];
    return ['איזה כלי חסר לכם?', 'שלום {שם},' + BR + 'אני בונה כלים חינמיים לפי מה שאנשים צריכים בפועל. איזה כלי היה חוסך לכם הכי הרבה זמן ב' + who + '? ענו למייל הזה בשורה אחת, ואם אפשר, אבנה אותו.' + BR + wa('שלום גילעד, הכלי שחסר לי הוא: ', 'לכתוב לי בווטסאפ') + BR + 'בברכה,<br>גילעד'];
  }
  if (step === 'G3') return ['הכלי שלכם, בלוגו ובצבעים של ' + who, 'שלום {שם},' + BR + 'אם אתם משתמשים בכלי חינמי ורוצים שיהיה בלוגו ובצבעים של ' + who + ':<ul><li>כלי אחד, בלוגו, בצבעים ובקישור משלכם, עם קוד QR</li><li>כפתור "שלחו לי את התוצאה בוואטסאפ" שמביא פניות ישר אליכם</li><li>מוכן תוך 48 שעות, עם סבב תיקונים אחד</li></ul>290 ₪ במחיר השקה (אחרי ההשקה: 450 ₪), תשלום חד-פעמי, בלי מנוי, כולל קבלה.' + BR + b290 + BR + hard + BR + 'בברכה,<br>גילעד'];
  return ['המייל האחרון: חבילות לעסק', 'שלום {שם},' + BR + 'זה המייל האחרון בסדרה. אם רוצים יותר מכלי אחד:<ul><li><b>590 ₪</b> – עד שלושה מחשבונים בלוגו שלכם, קוד הטמעה, דף מרכז, דוח חודשי ושני סבבי תיקונים. ' + link(pUrl(PAY.kit, slug, step), 'לפרטים', step) + '</li><li><b>990 ₪</b> – החבילה המלאה ועוד כרטיס ביקור דיגיטלי ודף עסק קטן. ' + link(pUrl(PAY.digital, slug, step), 'לפרטים', step) + '</li></ul>אלה מחירי השקה, תשלום חד-פעמי, בלי מנוי. שאלות? ענו למייל הזה.' + BR + hard + BR + 'בהצלחה,<br>גילעד'];
}
// כל השלבים בסדרה אחת (לבדיקה ולשליחת דוגמה)
function giftSeries_(dryRun) {
  dryRun = dryRun === true;                               // טריגר זמן מעביר אובייקט אירוע
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
    if (lastSent instanceof Date && today - lastSent < 20 * 3600e3) continue;   // לא יותר ממייל אחד ביום
    var slug = giftSlug_(r[C['מקור']]);
    if (!MATANA[slug]) continue;
    if (String(r[C['הערות']] || '').indexOf(PENDING) > -1) continue;           // קודם מייל המתנה
    if (!dryRun && !takeSeries_()) break;
    seen[em] = 1;
    var m = giftMail(slug, nxt[0]), html = wrapGift(m[1].replace(/שלום \{שם\}/g, gHello(r[C['שם']])), unsubLink(r[C['טוקן']]), slug, m[2]);
    if (dryRun) { sent.push((i + 1) + ':' + slug + ':' + nxt[0]); continue; }
    try {
      giftSend(r[C['מייל']], m[0], html, slug);
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
      giftSend(CFG.OWNER_EMAIL, '[דוגמה ' + slug + ' ' + s[0] + '] ' + m[0], wrapGift(m[1].replace(/\{שם\}/g, 'גילעד'), unsubLink('test'), slug, m[2]), slug);
    });
  });
}
// בדיקה מהעורך: מדמה שליחת טופס מדף מתנה
function testPostGift() {
  return doPost({ parameter: { 'שם': 'בדיקה – Claude', 'email': CFG.OWNER_EMAIL, 'מקור': 'מתנה: roe', 'utm_source': 'test', 'utm_content': 'x', 'מאשר/ת קבלת עדכונים': 'כן' } }).getContent();
}

// ---------- סדרות הקונים (גילעד אישר הפעלה 24.11.2026: "בטח שמאשר הפעלה!") ----------
var BUYER_SERIES_ON = true;
var BUYER_STEPS = { 'קנה קטן': [['B1', 0], ['B2', 2], ['B3', 5], ['B4', 8]], 'קנה קבוצה': [['B1', 0], ['B2', 2], ['B3', 5], ['B4', 8]], 'קנה גדול': [['K1', 0], ['K2', 2], ['K3', 7], ['K4', 14]] };
var BUYER_REFUND = '14 יום לנסות בשקט. לא מתאים? מחזיר לך את הכסף, בלי שאלות. לא הספקת לבדוק? כתוב לי בווטסאפ ואאריך לך את תקופת הניסיון, באהבה.';
var BUYER_WHY = 'זה מיזם חסד. אז למה בכלל תשלום? כי למדתי שמה שמקבלים בחינם נשאר בצד. תשלום סמלי גורם לך לפתוח, לנסות ולהשתמש באמת, וזו כל המטרה שלי.';
var BUYER_INCOME = 'ההכנסות מחזיקות את המיזם ומאפשרות לי להמשיך לבנות כלים בחינם לכולם';
// לכל משפך: הצעד הראשון, כלי להדרכה, מה הלקוח מקבל כשהוא משדרג, ודוגמת חישוב (דוגמה בלבד, לא הבטחה)
var BUYER_INFO = {
  'roe': { act: 'מדפיסים את דף רשימת המסמכים ושולחים אותו ללקוח הבא', tool: ['/kelim/mismachim-leroe-cheshbon/', 'מדריך המסמכים ללקוח'], up: ['כלי חישוב ממותג אחד של המשרד, עם כפתור ווטסאפ וקוד QR', '/matana/roe/shidrug/'], save: 'משרד ששולח ל-40 לקוחות בחודש רשימת מסמכים ידנית של 10 דקות לכל אחד, יכול לחסוך כשש שעות בחודש' },
  'orchei-din': { act: 'פותחים את טופס איסוף המסמכים ושולחים אותו ללקוח החדש', tool: ['/kesef/pitzuyim-pitorin/', 'מחשבון פיצויי פיטורין'], up: ['מחשבון זכויות ממותג של המשרד, עם כפתור ווטסאפ וקוד QR', '/matana/orchei-din/shidrug/'], save: 'משרד שעונה ל-30 פניות בחודש על שאלות חישוב של 5 דקות כל אחת, יכול לחסוך כשעתיים וחצי בחודש' },
  'esek': { act: 'בוחרים פוסט אחד מהערכה ומפרסמים אותו היום', tool: ['/esek/mivtza/', 'מודעת מבצע לסטטוס'], up: ['כלי אחד בלוגו ובצבעי העסק שלכם, עם כפתור ווטסאפ וקוד QR', '/matana/esek/shidrug/'], save: 'עסק שמקבל 20 שאלות מחיר בחודש וחוסך 5 דקות בכל אחת, יכול לחסוך כשעה וחצי בחודש' },
  'kelim': { act: 'בוחרים פוסט אחד מהערכה ומפרסמים אותו היום', tool: ['/kelim/tochen/mail/', 'ניסוח מיילים'], up: ['כלי אחד בלוגו ובצבעי העסק שלכם, עם כפתור ווטסאפ וקוד QR', '/matana/kelim/shidrug/'], save: 'עסק שכותב 20 מיילים בחודש וחוסך 5 דקות בכל אחד, יכול לחסוך כשעה וחצי בחודש' },
  'claude': { act: 'פותחים את קבוצת הווטסאפ ושואלים בה את השאלה הראשונה שלכם', tool: ['/kelim/tochen/', 'כלי הכתיבה והתרגום'], up: ['הקורס המלא: לעבוד עם Claude, מחיר מייסדים 147 ₪ ל-30 הראשונים', '/matana/claude/shidrug/'], save: '' },
  'mohel-kurs': { act: 'קוראים את המפה ובוחרים את השלב הראשון שלכם', tool: ['/kodesh/mohalim/', 'הכלים למוהלים'], up: ['הקורס המלא למוהלים, עם ליווי מעשי', '/matana/mohel-kurs/shidrug/'], save: '' }
};
function buyerMail(slug, step) {
  var I = BUYER_INFO[slug], BR = '<br><br>', SIGN = BR + 'אני כאן לכל שאלה בווטסאפ או במייל.<br>גילעד', mk = slug === 'mohel-kurs';
  var tl = function (u, t) { return gBtn(pUrl('https://hakelim.com' + u, slug, step), t); };
  var wa = function (t) { return gWa(slug, t, 'שאלה? כתבו לי בווטסאפ'); };
  var why = '<div style="margin:14px 0;padding:10px 14px;border:1px dashed #e8b94a;border-radius:10px;font-size:14px">' + BUYER_WHY + (mk ? '' : ' ' + BUYER_INCOME + '. ככה כולם מרוויחים: אתה מקבל כלי שחוסך לך זמן וכסף, והמיזם ממשיך לתת כלים בחינם לעוד אנשים.') + '</div>';
  var refund = mk ? '' : '<div style="margin:10px 0;font-size:14px"><b>אחריות 14 יום.</b> ' + BUYER_REFUND + '</div>';
  var ps = function (u) { return mk ? '' : BR + 'נ.ב. ' + BUYER_REFUND + ' <a href="' + pUrl('https://hakelim.com' + u, slug, step) + '">לפרטים ולרכישה</a>'; };
  if (step === 'B1') return ['תודה על הרכישה, וככה מתחילים', 'שלום {שם},' + BR + 'תודה על הרכישה. הקבצים והקבלה נמצאים בדף ההורדה של Payhip ובמייל שקיבלתם ממנו. הצעד הראשון: ' + I.act + '.' + SIGN];
  if (step === 'B2') return ['דקה אחת וזה נראה כמו שלכם', 'שלום {שם},' + BR + 'הקבצים ניתנים לעריכה. מחליפים את שם המקום ואת הלוגו בשלכם, שומרים, ומשתמשים. אם משהו לא עובד, ענו למייל הזה ואתקן.' + SIGN];
  if (step === 'B3') return ['כלי חינמי אחד שמשלים את מה שקניתם', 'שלום {שם},' + BR + 'הכלי הבא הוא בחינם ומשלים את מה שקניתם:' + BR + tl(I.tool[0], I.tool[1]) + BR + 'ואם חסר לכם כלי אחר, כתבו לי איזה, ואשתדל לבנות.' + SIGN];
  if (step === 'B4') {
    var sv = I.save ? BR + 'דוגמה לחישוב, לא הבטחה: ' + I.save + '.' : '';
    return ['השלב הבא, אם זה מתאים לכם', 'שלום {שם},' + BR + 'אם מה שקניתם עבד לכם והייתם רוצים לקחת אותו צעד קדימה: ' + I.up[0] + '.' + sv + BR + tl(I.up[1], 'לפרטים') + why + refund + ps(I.up[1]) + SIGN];
  }
  if (step === 'K1') return ['ההזמנה התקבלה, מה אני צריך ממכם', 'שלום {שם},' + BR + 'תודה! כדי להתחיל אני צריך: לוגו (קובץ תמונה), צבעים אם יש, והכתובת שתרצו לקישור. אפשר לשלוח בווטסאפ או להשיב למייל הזה. את הקישור לקבוצת הליווי אשלח בהודעה אישית.' + BR + wa('שלום גילעד, רכשתי ואני רוצה להתחיל') + SIGN];
  if (step === 'K2') return ['הגיע אליי הלוגו?', 'שלום {שם},' + BR + 'בדיקה קצרה: הצלחתם לשלוח את הלוגו והצבעים? אם משהו תקוע, כתבו לי ונסגור את זה היום.' + BR + wa('שלום גילעד, בקשר להזמנה שלי') + SIGN];
  if (step === 'K3') return ['הכלי שלכם מוכן', 'שלום {שם},' + BR + 'הכלי מוכן. הקישור, קוד ה-QR והסבר קצר איך משתפים אותו נמצאים בהודעה האישית שלי. כדאי לשלוח אותו השבוע ללקוח אחד ולראות מה קורה.' + SIGN];
  return ['שאלה קטנה אחרונה', 'שלום {שם},' + BR + 'אם אתם מרוצים, אשמח להמלצה של משפט או שניים שאפשר לפרסם בשמכם. ואם לא הכול עבד כמו שרציתם, ספרו לי, זה עוזר לי יותר.' + BR + wa('שלום גילעד, בקשר למה שקניתי') + SIGN];
}
// הזמנה להיות שותף: לא נשלחת אוטומטית, והאחוז ריק בכוונה (גילעד קובע ומפעיל)
var PARTNER_PCT = '';
function partnerInviteMail(slug) {
  if (!PARTNER_PCT) return null;
  var BR = '<br><br>';
  return ['רוצים להרוויח מלהמליץ?', 'שלום {שם},' + BR + 'אם זה עזר לכם, אתם מוזמנים להיות שותפים: מקבלים קישור אישי, ועל כל רכישה דרכו ' + PARTNER_PCT + ' מהסכום. ענו למייל הזה ואשלח את הפרטים והקישור.' + BR + 'אני כאן לכל שאלה בווטסאפ או במייל.<br>גילעד'];
}
function buyerNurture(dryRun) {
  dryRun = dryRun === true;                               // טריגר זמן מעביר אובייקט אירוע
  if (!BUYER_SERIES_ON && !dryRun) return [];
  if (!dryRun && isShabbatOrHoliday(new Date())) return [];
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS), data = sh.getDataRange().getValues(), today = new Date(), sent = [], seen = {};
  for (var i = 1; i < data.length && sent.length < 25; i++) {
    var r = data[i], stage = r[C['שלב']], steps = BUYER_STEPS[stage];
    if (r[C['סטטוס']] !== 'קנה' || !steps || r[C['הסכמה לדיוור']] !== 'כן' || !r[C['מייל']]) continue;
    var em = String(r[C['מייל']]).toLowerCase(); if (seen[em]) continue;
    var slug = stage === 'קנה קבוצה' ? 'claude' : giftSlug_(r[C['מקור']]); if (!BUYER_INFO[slug]) continue;
    var due = r[C['מייל הבא']]; if (!(due instanceof Date) || due > today) continue;
    var last = String(r[C['שלב בסדרה']] || ''), idx = -1;
    steps.forEach(function (s, k) { if (s[0] === last) idx = k; });
    var nxt = steps[idx + 1]; if (!nxt) continue;
    if (!dryRun && !takeSeries_()) break;
    seen[em] = 1;
    var m = buyerMail(slug, nxt[0]), html = wrapGift(m[1].replace(/שלום \{שם\}/g, gHello(r[C['שם']])), unsubLink(r[C['טוקן']]), slug);
    if (dryRun) { sent.push((i + 1) + ':' + slug + ':' + nxt[0]); continue; }
    try {
      giftSend(r[C['מייל']], m[0], html, slug);
      sent.push((i + 1) + ':' + slug + ':' + nxt[0]);
      sh.getRange(i + 1, C['שלב בסדרה'] + 1).setValue(nxt[0]);
      var after = steps[idx + 2];
      sh.getRange(i + 1, C['מייל הבא'] + 1).setValue(after ? addDays(today, after[1] - nxt[1]) : '');
      sh.getRange(i + 1, C['נשלח לאחרונה'] + 1).setValue(today);
    } catch (err) { log('קונים, שורה ' + (i + 1) + ': ' + err); }
  }
  if (sent.length) log((dryRun ? 'dry ' : '') + 'buyerNurture: ' + sent.join(', '));
  return sent;
}
// בדיקה מהעורך: שולח לגילעד את כל מיילי הקונים של כל המשפכים
function testSendBuyers() {
  Object.keys(BUYER_INFO).forEach(function (slug) {
    ['B1', 'B2', 'B3', 'B4', 'K1', 'K2', 'K3', 'K4'].forEach(function (s) {
      var m = buyerMail(slug, s);
      giftSend(CFG.OWNER_EMAIL, '[דוגמה קונה ' + slug + ' ' + s + '] ' + m[0], wrapGift(m[1].replace(/\{שם\}/g, 'גילעד'), '', slug), slug);
    });
  });
}

// ---------- הודעה לגילעד ----------
function notifyOwner(row, dup) {
  var name = row[C['שם']], phone = row[C['טלפון']], email = row[C['מייל']], due = row[C['מועד לידה']], city = row[C['עיר']], source = row[C['מקור']];
  var line = (/^מתנה:/.test(String(source)) ? '🎁 ליד ממתנה: ' : /^כלים: שיפור/.test(String(source)) ? '💡 הצעה לשיפור כלי: ' : /^כלים: משפחת הכלים/.test(String(source)) ? 'הצטרפות למשפחת הכלים: ' : dup ? 'ליד חוזר: ' : 'ליד חדש: ') + name + (city ? ' · ' + city : '') + (due ? ' · ' + dueLabel(due) : '');
  var body = line + '\nטלפון: ' + phone + '\nמייל: ' + email + '\nמקור: ' + source +
    (phone ? '\n\nווטסאפ מוכן:\n' + waLink(phone, /^(כלים:|מתנה:)/.test(String(source)) ? 'שלום ' + String(name).split(' ')[0] + ', כאן גילעד מהכלים של גילעד רחמים. תודה שכתבת לי! ' : waMessage('WA-1', row)) : '') +
    '\n\nהגיליון: ' + SpreadsheetApp.getActive().getUrl();
  if (phone && !/^(כלים:|מתנה:)/.test(String(source))) MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: line, body: body, name: 'האתר – לידים' });
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
// ברכה: בלי שם (דפי מתנה) – "שלום" בלבד
function gHello(name) { return !name || name === 'ללא שם' ? 'שלום' : 'שלום ' + firstName(name); }
// הגבלת קצב: עד 2 שליחות לאותו מייל/טלפון ב-6 שעות (המקסימום של CacheService)
function tooMany(who, max) {
  var key = 'rl:' + String(who).toLowerCase().slice(0, 100), cache = CacheService.getScriptCache();
  var n = parseInt(cache.get(key) || '0', 10);
  cache.put(key, String(n + 1), 21600);
  return n >= (max || 2);
}
// תקרה יומית למיילים להורים, כדי שהצפה של הטופס לא תגמור את מכסת ה-100 של Gmail
var DAILY_CAP = 70;       // מיילים מיידיים לנרשמים ביום
var SERIES_BUDGET = 25;   // השלמות + סדרות בריצה היומית
var SERIES_LEFT = 0;
var PENDING = 'ממתין למייל';
function takeSeries_() {
  if (SERIES_LEFT <= 0 || MailApp.getRemainingDailyQuota() <= 5) return false;
  SERIES_LEFT--; return true;
}
function addNote_(old, note) { return old ? old + ' · ' + note : note; }
function needsMail_(src) { return !/^כלים:/.test(src) || /^כלים: יוטיוב בלי פרסומות/.test(src); }
function sendLeadMail_(name, email, token, consent, src) {
  if (isGift_(src)) sendGiftEmail(name, email, token, consent, giftSlug_(src));
  else if (/^כלים: יוטיוב בלי פרסומות/.test(src)) sendYoutubeEmail(name, email);
  else if (src === 'מחולל הודעה לברית') sendHazmanaEmail(name, email);
  else if (src === 'מחולל הודעה לזבד הבת') sendZevedEmail(name, email);
  else if (src === 'מחולל הודעה לפדיון הבן') sendPidyonEmail(name, email);
  else sendGuideEmail(name, email, token, consent);
}
// חד-פעמי (27.11.2026): מסמן "ממתין למייל" את מי שלפי היומן לא קיבל מייל
function queueMissed_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('backfill-2711')) return 0;
  var ss = SpreadsheetApp.getActive(), missed = {}, n = 0;
  sheet(ss, CFG.SHEET_LOG, ['תאריך', 'הודעה']).getDataRange().getValues().forEach(function (l) {
    var msg = String(l[1] || ''), m = msg.match(/לא נשלח מייל להורה: (\S+)/) || msg.match(/^מייל (?:מתנה|יוטיוב) נכשל: .*email\. \| (\S+)/);
    if (m) missed[m[1].toLowerCase()] = 1;                // שגיאת doPost לבדה = ההתראה נכשלה, המייל לנרשם יצא (נבדק בדואר היוצא)
  });
  var sh = sheet(ss, CFG.SHEET_LEADS, COLS), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var r = data[i], em = String(r[C['מייל']] || '').toLowerCase();
    if (!missed[em] || r[C['הסכמה לדיוור']] === 'הוסר' || !needsMail_(String(r[C['מקור']]))) continue;
    delete missed[em];                                     // שורה אחת לכל כתובת
    sh.getRange(i + 1, C['הערות'] + 1).setValue(addNote_(r[C['הערות']], PENDING));
    n++;
  }
  props.setProperty('backfill-2711', String(n));
  log('queueMissed: ' + n + ' ממתינים למייל');
  return n;
}
function catchUp_() {
  var sh = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS), data = sh.getDataRange().getValues(), today = new Date(), sent = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i], note = String(r[C['הערות']] || '');
    if (note.indexOf(PENDING) < 0 || !r[C['מייל']] || r[C['הסכמה לדיוור']] === 'הוסר') continue;
    if (!takeSeries_()) break;
    var done = 'מייל נשלח באיחור ' + Utilities.formatDate(today, CFG.TZ, 'd.M');
    try {
      sendLeadMail_(r[C['שם']], r[C['מייל']], r[C['טוקן']], r[C['הסכמה לדיוור']], String(r[C['מקור']]));
      sh.getRange(i + 1, C['נשלח לאחרונה'] + 1).setValue(today);
      sent.push((i + 1) + ':late');
    } catch (err) {
      log('השלמה, שורה ' + (i + 1) + ': ' + err);
      if (MailApp.getRemainingDailyQuota() < 1) break;
      done = 'מייל נכשל';
    }
    sh.getRange(i + 1, C['הערות'] + 1).setValue(note.replace(PENDING, done));
  }
  if (sent.length) log('catchUp: ' + sent.join(', '));
  return sent;
}
// מייל אחד ביום לגילעד במקום מייל על כל ליד ממתנה
function ownerDigest_() {
  var props = PropertiesService.getScriptProperties(), now = new Date();
  var since = Number(props.getProperty('digest-last')) || now.getTime() - 3 * 864e5;   // ריצה ראשונה: כולל שבת
  var data = sheet(SpreadsheetApp.getActive(), CFG.SHEET_LEADS, COLS).getDataRange().getValues(), by = {}, total = 0, wait = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][C['הערות']] || '').indexOf(PENDING) > -1) wait++;
    var d = data[i][C['תאריך']];
    if (!(d instanceof Date) || d.getTime() <= since) continue;
    var k = String(data[i][C['מקור']]).slice(0, 40); by[k] = (by[k] || 0) + 1; total++;
  }
  if (!total && !wait) return;
  var body = 'לידים חדשים מאז הסיכום הקודם: ' + total + '\n' + Object.keys(by).map(function (k) { return '• ' + k + ': ' + by[k]; }).join('\n') +
    '\n\nעדיין ממתינים למייל: ' + wait + '\n\nהגיליון: ' + SpreadsheetApp.getActive().getUrl();
  MailApp.sendEmail({ to: CFG.OWNER_EMAIL, subject: 'סיכום לידים: ' + total + ' חדשים, ' + wait + ' ממתינים', body: body, name: 'האתר – לידים' });
  props.setProperty('digest-last', String(now.getTime()));
}
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
