// "🧹 מה לעשות?" – פקודה במילים לשירותי גוגל: ג׳ימייל, דרייב, יומן, מסמכים, גיליונות, מצגות וטפסים.
// הפענוח נעשה כאן, במחשב, בלי שרת ובלי AI. התוצאה היא רק כתובת של גוגל עצמו (חיפוש, חלון יצירה, תצוגה),
// ותצוגה מקדימה של בדיוק מה ייפתח. שום דבר לא משתנה בחשבון: מחיקה, תווית או שליחה – המשתמש לוחץ בעצמו בגוגל.
// צריך את when.js לפניו (HKWhen).
(function (root) {
  var W = root.HKWhen;
  var NUMW = { 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6, 'שבעה': 7, 'שבע': 7, 'עשרה': 10, 'עשר': 10 };
  var SVC = {
    gmail: ['✉', 'ג׳ימייל'], drive: ['📁', 'דרייב'], calendar: ['📅', 'יומן גוגל'], docs: ['📄', 'מסמכי גוגל'],
    sheets: ['📊', 'גיליונות גוגל'], slides: ['📽', 'מצגות גוגל'], forms: ['📝', 'טפסי גוגל'], keep: ['🗒', 'Google Keep'], contacts: ['👥', 'אנשי קשר']
  };
  // שולחים מוכרים: השם בעברית + הדומיין, כי שם השולח במייל לפעמים באנגלית
  var SENDERS = {
    'בנק הפועלים': 'bankhapoalim.co.il', 'הפועלים': 'bankhapoalim.co.il', 'בנק לאומי': 'leumi.co.il', 'לאומי': 'leumi.co.il',
    'דיסקונט': 'discountbank.co.il', 'בנק דיסקונט': 'discountbank.co.il', 'מזרחי': 'mizrahi-tefahot.co.il', 'מזרחי טפחות': 'mizrahi-tefahot.co.il', 'בנק מזרחי': 'mizrahi-tefahot.co.il',
    'ביטוח לאומי': 'btl.gov.il', 'מס הכנסה': 'taxes.gov.il', 'רשות המסים': 'taxes.gov.il', 'חברת חשמל': 'iec.co.il', 'חברת החשמל': 'iec.co.il',
    'בזק': 'bezeq.co.il', 'פרטנר': 'partner.co.il', 'סלקום': 'cellcom.co.il', 'הוט': 'hot.net.il', 'מכבי': 'maccabi4u.co.il', 'כללית': 'clalit.co.il',
    'מאוחדת': 'meuhedet.co.il', 'לאומית': 'leumit.co.il', 'ישראכרט': 'isracard.co.il', 'כאל': 'cal-online.co.il', 'מקס': 'max.co.il',
    'אמזון': 'amazon', 'עלי אקספרס': 'aliexpress', 'אליאקספרס': 'aliexpress', 'פייפאל': 'paypal', 'גוגל': 'google.com', 'פייסבוק': 'facebookmail.com'
  };
  var TOPICS = [
    [/חשבוני(?:ו)?ת|קבלות|קבלה/, '(חשבונית OR קבלה OR invoice OR receipt)', 'חשבוניות וקבלות'],
    [/הזמנות|משלוח|משלוחים|הזמנה שלי/, '(הזמנה OR משלוח OR order OR shipping)', 'הזמנות ומשלוחים'],
    [/טיסה|טיסות|כרטיס טיסה/, '(טיסה OR flight OR booking)', 'טיסות'],
    [/תלוש|תלושי שכר|תלושים/, '(תלוש OR "תלוש שכר" OR payslip)', 'תלושי שכר']
  ];
  var FILES_DRIVE = /(?:לשמור|תשמור|לגבות|תגבה|להעלות|תעלה|להעביר|תעביר)\s(?:ל|ב)(?:גוגל\s)?דרייב\s(?:\S+\s){0,4}?(?:קבצים|קובץ|הקבצים|מצורפ\S*|צרופות|הצרופות|חשבוניות|החשבוניות|קבלות|הקבלות)|(?:לשמור|תשמור|לגבות|תגבה|להעלות|תעלה|להעביר|תעביר|להוסיף|תוסיף)\s(?:\S+\s){0,5}?(?:קבצים|קובץ|הקבצים|מצורפ\S*|צרופות|הצרופות|חשבוניות|החשבוניות|קבלות|הקבלות)\s(?:\S+\s){0,7}?(?:ל|ב)(?:גוגל\s)?דרייב|(?:לשמור|תשמור|לגבות|תגבה)\s(?:\S+\s){0,3}?(?:ה)?(?:קבצים|צרופות)\s(?:ה)?מצורפ(?!\S*\s(?:\S+\s){0,4}(?:ל|ב)(?:מחשב|תווית))/;
  var FILES_DOWN = /(?:להוריד|תוריד|לשמור|תשמור)\s(?:ל|ב)מחשב\s(?:\S+\s){0,4}?(?:קבצים|קובץ|הקבצים|מצורפ\S*|צרופות|הצרופות|חשבוניות|החשבוניות|קבלות|הקבלות)|(?:להוריד|תוריד|לשמור|תשמור)\s(?:\S+\s){0,5}?(?:קבצים|קובץ|הקבצים|מצורפ\S*|צרופות|הצרופות|חשבוניות|החשבוניות|קבלות|הקבלות)\s(?:\S+\s){0,7}?(?:ל|ב)מחשב|(?:להוריד|תוריד)\s(?:\S+\s){0,3}?(?:ה)?(?:קבצים|צרופות)\s(?:ה)?מצורפ/;
  var LIST_WORDS = /אקסל|excel|לייצא|ייצוא|טבלה|טבלת|רשימה|רשימת|מעקב|לסכם|סיכום|סה"כ|סך\sהכול|כמה\sכסף/i;
  var UNIT = '(?:יום|ימים|יומיים|שבוע|שבועות|שבועיים|חודש|חודשים|חודשיים|שנה|שנים|שנתיים)';
  function clean(t) {
    return ' ' + String(t || '').replace(/[״“”]/g, '"').replace(/[׳`’]/g, '\'').replace(/[־–—]/g, '-').replace(/[?!.,]+(\s|$)/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }
  function n(x) { return !x ? 1 : /^\d+$/.test(x) ? +x : NUMW[x] || 1; }
  function unitDays(u, k) {
    if (u === 'יומיים') return 2; if (u === 'שבועיים') return 14; if (u === 'חודשיים') return 60; if (u === 'שנתיים') return 730;
    return k * (/^י/.test(u) ? 1 : /^שבוע/.test(u) ? 7 : /^חוד/.test(u) ? 30 : 365);
  }
  function daysHe(d) {
    if (d === 1) return 'מהיום'; if (d === 2) return 'מאתמול והיום'; if (d === 7) return 'מהשבוע האחרון'; if (d === 14) return 'משבועיים אחרונים';
    if (d === 30) return 'מהחודש האחרון'; if (d === 365) return 'מהשנה האחרונה';
    if (d % 365 === 0) return 'מ-' + d / 365 + ' השנים האחרונות'; if (d % 30 === 0) return 'מ-' + d / 30 + ' החודשים האחרונים'; if (d % 7 === 0) return 'מ-' + d / 7 + ' השבועות האחרונים';
    return 'מ-' + d + ' הימים האחרונים';
  }
  function olderHe(d) { return 'ישנים מ' + (d === 365 ? 'שנה' : d === 30 ? 'חודש' : d === 7 ? 'שבוע' : d % 365 === 0 ? '-' + d / 365 + ' שנים' : d % 30 === 0 ? '-' + d / 30 + ' חודשים' : '-' + d + ' ימים'); }
  // טווח זמן: { newer: ימים } או { older: ימים }
  function range(t) {
    var m = t.match(new RegExp('(?:ישנ\\S*\\s(?:יותר\\s)?מ-?\\s?|לפני\\sיותר\\sמ-?\\s?|יותר\\sמ-?\\s?|מעל\\s|לפני\\s|שלא\\sנגעתי\\sבהם\\s)(\\d+|[א-ת]+\\s)?\\s?(' + UNIT.slice(3, -1) + ')(?=\\s)'));
    if (m && !/^(?:ה|מה)/.test(m[2])) return { older: unitDays(m[2], n((m[1] || '').trim())) };
    if (/\s(?:מ)?אתמול\s/.test(t)) return { newer: 2 };
    m = t.match(new RegExp('\\s(?:ב|מ|מה|בה|ה|של|ב-|מ-)?\\s?(\\d+\\s|(?:אחד|שניים|שלושה|ארבעה|חמישה|שישה|שבעה|עשרה|שלוש|ארבע|חמש|שש|שבע|עשר)\\s)?(?:ה)?(' + UNIT.slice(3, -1) + ')(?:\\s(?:ה)?אחרונ\\S*)?(?=\\s)'));
    if (m && !/\sיום\s(?:ה)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|הולדת)/.test(t.slice(m.index, m.index + m[0].length + 8))) return { newer: unitDays(m[2], n((m[1] || '').trim())) };
    return null;
  }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  // סוף של טקסט חופשי (שם קובץ, נושא): עד מילת זמן / מקום / סינון
  var UNTIL = /(?=\s(?:בדרייב|בג'?ימייל|במייל|מה(?:שבוע|חודש|יום|שנה|שנתיים)\S*|ששיתפו|שיתפו|שלי|עם|בלי|מ-\S+|ב-\S+|ישנ\S*|מלפני|מאתמול|השבוע|החודש|השנה|שלא|לפני|מעל)(?=\s)|\s$)/.source;
  function quoted(t) { var m = t.match(/"([^"]{1,60})"/) || t.match(/'([^']{2,60})'/); return m ? m[1].trim() : ''; }
  var STOP = /^(?:עם|בלי|שלא|שיש|שאין|על|בנושא|בתווית|לתווית|מתווית|או|גם|ש|ב|ל|ישנים|גדולים|לפני|מעל|יותר|השבוע|החודש|היום|השנה|אתמול|מאתמול|שקיבלתי|ששלחו|ששלח|ששלחה|שהגיעו|שלי|בדואר|בתיבה|את|כל|ולסמן|ולמחוק|ולהעביר|ולארכב|מהזמן|האחרון|האחרונים|האחרונה|שלא נקראו|שנשלחו|קבצים|קובץ|pdf)$/i;
  function isTimeWord(w) { return new RegExp('^(?:מ|מה|ב|בה|ה)?-?' + UNIT + '$').test(w) || /^(?:מ)?אתמול$|^מלפני$|^מעכשיו$|^מאז$/.test(w) || /^(?:מ-?)?\d+$/.test(w); }
  // השולח: "מבנק הפועלים", "מ-דני", "מאת משה כהן", "ממשה", "של חברת חשמל", כתובת מייל
  var NOT_SENDER = /^(?:מרשימות|מרשימת|מהרשימה|מהרשימות|מהדיוור|מהתיבה|מהדואר|מה|מיילים|מייל|המיילים|מסמך|מסמכים|מסומנים|מסומן|מצורף|מצורפים|מחר|מחוקים|מתוזמנים|מהתווית|מהתיבה|מכל|מעל|מאז|מלפני|מעכשיו|משהו|מי|מתי|מספר|מגה|מתחת|מהר|מוקדם|מאוחר)$/;
  function sender(t) {
    var e = t.match(/(?:מ-?|מאת\s|from:)?\s?(\w[\w.+-]*@[\w-]+(?:\.[\w-]+)+)/i);
    var toM = t.match(/(?:ששלחתי|שלחתי|שנשלחו)\s(?:\S+\s)?ל-?\s?(\w[\w.+-]*@[\w-]+(?:\.[\w-]+)+)/);
    if (e && !(toM && toM[1] === e[1])) return e[1];
    var w = t.trim().split(' '), i, start = -1, first = '';
    for (i = 0; i < w.length; i++) {
      if (w[i] === 'מאת' || w[i] === 'מ-' || w[i] === 'מ' || (w[i] === 'של' && i > 0 && /מייל|הודעות|דואר/.test(w[i - 1]))) { if (w[i + 1] && !isTimeWord(w[i + 1]) && !STOP.test(w[i + 1])) { start = i + 1; first = w[i + 1]; break; } continue; }
      if (/^(?:ששלחו|ששלח|ששלחה|שהגיעו|שקיבלתי)$/.test(w[i]) && w[i + 1] && /^מ-?\S/.test(w[i + 1]) && !isTimeWord(w[i + 1])) { start = i + 1; first = w[i + 1].replace(/^מ-?/, ''); break; }
      if (i > 0 && /^מ-?[א-תa-z0-9]/i.test(w[i]) && !NOT_SENDER.test(w[i]) && !isTimeWord(w[i]) && !/^מה(?:חודש|שבוע|יום|שנה)/.test(w[i]) && w[i].length > 2) { start = i; first = w[i].replace(/^מ-?/, ''); break; }
    }
    if (start < 0) return '';
    var out = [first];
    for (i = start + 1; i < w.length && out.length < 4; i++) {
      if (STOP.test(w[i]) || isTimeWord(w[i]) || /^(?:ש|ב|ל|מ|ו)\S*(?:ים|ות)?$/.test(w[i]) && !/^(?:הפועלים|הכנסה|המסים|החשמל|חשמל|לאומי|טפחות|אקספרס)$/.test(w[i]) && !SENDERS[out.concat(w[i]).join(' ')]) break;
      out.push(w[i]);
    }
    return out.join(' ').replace(/^-/, '');
  }
  function senderQ(s) {
    if (/@/.test(s)) return 'from:' + s;
    var d = SENDERS[s] || SENDERS[s.replace(/^ה/, '')];
    return d ? 'from:(' + d + ' OR "' + s + '")' : (/\s/.test(s) ? 'from:"' + s + '"' : 'from:' + s);
  }
  function gmailBase(o) { return (o && o.gmailBase) || 'https://mail.google.com/mail/u/0/'; }
  function gsearch(o, q) { return gmailBase(o) + '#search/' + encodeURIComponent(q).replace(/%20/g, '+'); }

  // ---------- ג׳ימייל ----------
  function gmail(t, o) {
    var r = { svc: 'gmail', lines: [], alt: [] }, q = [], what = [];
    // כתיבת מייל חדש: רק טיוטה נפתחת, שולחים בעצמכם
    if (/(?:לכתוב|תכתוב|כתוב|לשלוח|תשלח|לנסח|תנסח)\s(?:\S+\s){0,2}(?:מייל|אימייל)(?!ים)/.test(t) && !/ששלחתי|שנשלחו|מיילים/.test(t)) {
      var to = (t.match(/\w[\w.+-]*@[\w-]+(?:\.[\w-]+)+/g) || []).join(',');
      var su = (t.match(/(?:בנושא|נושא:?|על)\s(.+?)(?:\s(?:ולכתוב|ותכתוב|ובגוף|גוף:|שאומר|ש)\s|\s$)/) || [])[1] || quoted(t);
      var body = (t.match(/(?:ובגוף|גוף:|שאומר|ולכתוב|ותכתוב)\s(.+?)\s$/) || [])[1] || '';
      var toName = !to ? ((t.match(/(?:מייל|אימייל)\s(?:ל-?|אל\s)(\S+(?:\s(?!בנושא|על|ש)\S+)?)/) || [])[1] || '') : '';
      r.url = gmailBase(o) + '?view=cm&fs=1&tf=1' + (to ? '&to=' + encodeURIComponent(to) : '') + (su ? '&su=' + encodeURIComponent(su.trim()) : '') + (body ? '&body=' + encodeURIComponent(body.trim()) : '');
      r.head = 'מייל חדש – טיוטה';
      if (to) r.lines.push('אל: ' + to); else r.lines.push(toName ? 'אל: מקלידים "' + toName + '" בשדה "אל" ובוחרים מהרשימה' : 'אל: ממלאים בחלון שנפתח');
      if (su) r.lines.push('נושא: ' + su.trim());
      if (body) r.lines.push('תוכן: ' + body.trim());
      r.btn = '✉ לפתוח טיוטה';
      r.note = 'שום דבר לא נשלח. הטיוטה נפתחת, ואתם בודקים ולוחצים "שליחה".';
      r.alt.push({ label: '✍ נוסח מוכן למייל', url: 'https://hakelim.com/kelim/tochen/mail/?utm_source=tosaf_cmd' });
      return r;
    }
    var unreplied = /(?:שלא|לא)\s(?:עניתי|הגבתי|החזרתי)|מחכים\s(?:לתשובה\s)?(?:ממני|לי)|לא\sענו\sלי|שלא\sענו/.test(t);
    var s = sender(t);
    var sentTo = (t.match(/(?:ששלחתי|שלחתי|שנשלחו ממני)\s(?:\S+\s)?ל-?\s?(\S+(?:\s(?!מה|עם|ב|על)\S+)?)/) || [])[1];
    if (/ששלחתי|שלחתי|שנשלחו\sממני|דואר\sיוצא|ממני/.test(t) && !unreplied) { q.push('in:sent'); what.push('ששלחתם'); if (sentTo) { sentTo = sentTo.replace(/^-/, ''); q.push(/@/.test(sentTo) ? 'to:' + sentTo : 'to:"' + sentTo + '"'); what.push('אל ' + sentTo); } s = ''; }
    if (s) { q.push(senderQ(s)); what.push('מ' + (/^[a-z0-9]/i.test(s) ? '-' : '') + s); }
    if (/\spdf\s|פי\sדי\sאף/i.test(t)) { q.push('filename:pdf'); what.push('עם PDF'); }
    else if (/(?:עם|יש\sבהם|שיש\sבהם)\s(?:ה)?תמונות|תמונות\sמצורפות/.test(t)) { q.push('has:attachment (filename:jpg OR filename:jpeg OR filename:png OR filename:heic)'); what.push('עם תמונות'); }
    else if (/וורד|word/i.test(t)) { q.push('(filename:doc OR filename:docx)'); what.push('עם קובץ וורד'); }
    else if (/אקסל|excel/i.test(t)) { q.push('(filename:xls OR filename:xlsx OR filename:csv)'); what.push('עם קובץ אקסל'); }
    else if (/קובץ|קבצים|צרופה|צרופות|מצורף|מצורפים|קבצים\sמצורפים|attachment/i.test(t)) { q.push('has:attachment'); what.push('עם קובץ מצורף'); }
    var mb = t.match(/(?:מעל|יותר\sמ-?|גדולים\sמ-?)\s?(\d+)\s?(?:מגה|mb|מ"ב|מגהבייט)/i);
    if (mb) { q.push('larger:' + mb[1] + 'M'); what.push('גדולים מ-' + mb[1] + 'MB'); }
    else if (/גדולים|כבדים|ענקיים|הכי\sגדולים|תופסים\sמקום/.test(t)) { q.push('larger:10M'); what.push('גדולים מ-10MB'); }
    if (/(?:שלא|לא)\s(?:קראתי|נקראו|נקרא|פתחתי|נפתחו)|חדשים\sשלא|unread/.test(t)) { q.push('is:unread'); what.push('שלא נקראו'); }
    else if (/שקראתי|שנקראו/.test(t)) { q.push('is:read'); what.push('שכבר נקראו'); }
    var starAct = /(?:לסמן|להוסיף|תסמן|תוסיף|לשים|תשים)\s(?:\S+\s){0,6}?(?:ב|עם\s)?כוכב|כוכב\sל(?:כל|כולם)/.test(t), impAct = /(?:לסמן|תסמן)\s(?:\S+\s){0,6}?כחשוב/.test(t);
    if (/כוכב|מסומנים|שסימנתי/.test(t) && !starAct) { q.push('is:starred'); what.push('מסומנים בכוכב'); }
    if (/חשובים|חשוב/.test(t) && !/לא\sחשוב/.test(t) && !impAct) { q.push('is:important'); what.push('חשובים'); }
    if (/דיוור|פרסומות|קידומי\sמכירות|ניוזלטר|מבצעים/.test(t)) { q.push('category:promotions'); what.push('דיוור ופרסומות'); }
    if (/רשתות|פייסבוק\sושות|חברתיות|social/.test(t)) { q.push('category:social'); what.push('רשתות חברתיות'); }
    if (/עדכונים/.test(t)) { q.push('category:updates'); what.push('עדכונים'); }
    if (/ספאם|דואר\sזבל/.test(t)) { q.push('in:spam'); what.push('בספאם'); }
    if (/אשפה|שמחקתי|שנמחקו|לשחזר/.test(t)) { q.push('in:trash'); what.push('באשפה'); }
    if (/טיוטות|טיוטה/.test(t)) { q.push('in:drafts'); what.push('טיוטות'); }
    if (/מתוזמנים|שתזמנתי/.test(t)) { q.push('in:scheduled'); what.push('מתוזמנים'); }
    if (/נודניק|שדחיתי|נדחו/.test(t)) { q.push('in:snoozed'); what.push('שנדחו'); }
    var lbAct = /(?:לשים|תשים|לסמן|תסמן|להעביר|תעביר|להכניס|תכניס|לשמור|תשמור|לאסוף|תאסוף)\s(?:\S+\s){0,4}?(?:ב|ל)תווית/.test(t);
    // קבצים מצורפים: לשמור בדרייב / להוריד למחשב (לחיצה על הכפתורים של ג׳ימייל עצמו, אחרי אישור)
    var filesAct = FILES_DRIVE.test(t) ? 'files-drive' : FILES_DOWN.test(t) ? 'files-down' : '';
    if (filesAct && q.indexOf('has:attachment') < 0 && !q.some(function (x) { return /filename:/.test(x); })) { q.push('has:attachment'); what.push('עם קובץ מצורף'); }
    var lb = !lbAct && t.match(/(?:בתווית|מתווית|שבתווית|עם\sתווית)\s"?([^"\s]+(?:\s[^"\s]+)?)"?/);
    if (lb && !/^(?:חדשה|אחת)$/.test(lb[1])) { lb = lb[1].replace(/\s(?:מה|עם|ש)\S*$/, ''); q.push('label:' + lb.replace(/\s/g, '-')); what.push('בתווית ' + lb); }
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i][0].test(t)) { q.push(TOPICS[i][1]); what.push(TOPICS[i][2]); break; }
    var subj = t.match(new RegExp(/בנושא\s(.+?)/.source + UNTIL)), qt = quoted(t), word = t.match(new RegExp(/(?:עם\sהמילה|עם\sהמילים|שכתוב\sבהם|שמופיע\sבהם|שמזכירים\sאת)\s(\S+(?:\s\S+)?)/.source + UNTIL));
    if (subj) { q.push('subject:(' + subj[1] + ')'); what.push('בנושא "' + subj[1] + '"'); }
    else if (qt && t.indexOf('תווית "' + qt + '"') < 0) { q.push('"' + qt + '"'); what.push('עם "' + qt + '"'); }
    else if (word) { q.push('"' + word[1] + '"'); what.push('עם "' + word[1] + '"'); }
    // שנה קלנדרית: "השנה", "מתחילת השנה", "בשנת 2025" (ולא 365 הימים האחרונים)
    var now = o.now || new Date(), yr = t.match(/(?:בשנת|שנת|לשנת|של\sשנת)\s(20\d\d)(?=\s)/), rg;
    if (yr) { q.push('after:' + yr[1] + '/01/01 before:' + (+yr[1] + 1) + '/01/01'); what.push('משנת ' + yr[1]); }
    else if (/\s(?:ב|מ)?השנה(?:\sהזאת|\sהזו)?\s|מתחילת\sהשנה/.test(t) && !/השנה\sה?אחרונה|שנה\sאחרונה/.test(t)) { q.push('after:' + now.getFullYear() + '/01/01'); what.push('מתחילת ' + now.getFullYear()); }
    else rg = range(t);
    if (rg && rg.older) { q.push('older_than:' + (rg.older % 365 === 0 ? rg.older / 365 + 'y' : rg.older % 30 === 0 ? rg.older / 30 + 'm' : rg.older + 'd')); what.push(olderHe(rg.older)); }
    else if (rg) { q.push('newer_than:' + (rg.newer % 365 === 0 ? rg.newer / 365 + 'y' : rg.newer % 30 === 0 ? rg.newer / 30 + 'm' : rg.newer + 'd')); what.push(daysHe(rg.newer)); }
    if (unreplied) {
      q.unshift('in:inbox -from:me -category:promotions -category:social -category:updates -category:forums');
      what.unshift('מיילים אישיים בתיבה');
      r.note = 'ג׳ימייל לא יודע לסנן "לא עניתי" בחיפוש. מוצגים המיילים האישיים מהתקופה, בלי דיוור ועדכונים – מי שאין לו חץ ↩ ליד השם עוד מחכה לתשובה. רשימה מדויקת כל בוקר: "סיכום מיילים".';
      r.alt.push({ label: '📬 סיכום מיילים כל בוקר', url: 'https://hakelim.com/kelim/machshev/sidur-mailim/?utm_source=tosaf_cmd' });
    }
    var unsubAsk = /להסיר|להוריד\sאותי|ביטול\sהרשמה|לבטל\sהרשמה|רשימות?\sתפוצה|רשימות?\sדיוור/.test(t);
    if (!q.length && unsubAsk) { q.push('category:promotions'); what.push('דיוור ופרסומות'); }
    if (!q.length && /תווית\sחדשה|ליצור\sתווית|לפתוח\sתווית/.test(t)) {
      var nl = (t.match(/תווית\s(?:חדשה\s)?(?:בשם\s|של\s|ל-?)?"?([^"]+?)"?\s$/) || [])[1] || '';
      nl = nl.replace(/^(?:חדשה\s)?(?:בשם\s)?/, '').replace(/\s?(?:בג'?ימייל|במייל)$/, '').trim();
      r.url = gmailBase(o) + '#settings/labels'; r.head = 'תווית חדשה בג׳ימייל' + (nl ? ': "' + nl + '"' : ''); r.btn = '🏷 לפתוח את התוויות';
      r.lines.push('נפתחות הגדרות התוויות ← "יצירת תווית חדשה" ← ' + (nl ? '"' + nl + '"' : 'השם') + ' ← "יצירה".');
      r.lines.push('טיפ: כותבים כאן "להעביר לתווית ' + (nl || 'X') + ' את כל המיילים מ..." – והתוסף גם יוצר את התווית וגם מסדר את המיילים.');
      return r;
    }
    if (!q.length) return null;
    var query = q.join(' ');
    r.q = query; r.url = gsearch(o, query); r.btn = '🔎 להראות בג׳ימייל';
    r.head = 'מיילים ' + what.join(' · ');
    r.lines.push('החיפוש: ' + query);
    // פעולות על התוצאות: התוסף מריץ את החיפוש, מראה על הדף כמה נמצאו, ומבצע רק אחרי "✓ לבצע"
    var tl = t.match(/(?:לתווית|בתווית|תחת\sתווית|לתייג\s(?:אותם\s)?(?:כ|ב)?-?|תווית\sבשם)\s?"?([^"\s]+(?:\s(?!מ|את|כל|של|ש)[^"\s]+)?)"?/);
    if (tl && !lbAct && !/לתווית|לתייג|תווית\sבשם|תחת\sתווית/.test(t)) tl = null;
    if (/מסנן|פילטר|אוטומטית|מעכשיו|מהיום\sוהלאה|שיגיעו|בעתיד|תמיד/.test(t) || tl) {
      var fp = [];
      if (s) fp.push('from=' + encodeURIComponent(/@/.test(s) ? s : SENDERS[s] || SENDERS[s.replace(/^ה/, '')] || s));
      var hasQ = q.filter(function (x) { return !/^from:/.test(x); }).join(' ');
      if (hasQ) fp.push('has=' + encodeURIComponent(hasQ));
      r.alt.unshift({ label: '📌 מסנן קבוע – גם למיילים שיגיעו', url: gmailBase(o) + '#create-filter/' + fp.join('&') });
    }
    var A = null, isInv = /חשבונית|קבלה|invoice|תלוש/.test(query);
    if (filesAct && !tl) A = filesAct === 'files-drive' ? { act: 'files-drive', he: 'לשמור את הקבצים המצורפים בדרייב' } : { act: 'files-down', he: 'להוריד את הקבצים המצורפים למחשב' };
    else if (tl) A ={ act: 'label', label: tl[1], he: 'להוסיף את התווית "' + tl[1] + '"' };
    else if (starAct) A = { act: 'star', he: 'לסמן בכוכב ⭐' };
    else if (impAct) A = { act: 'important', he: 'לסמן כחשוב' };
    else if (/למחוק|מחיקה|תמחק|למחיקה|לזרוק|לנקות/.test(t) && !/באשפה|in:trash/.test(query)) A = { act: 'delete', he: 'להעביר לאשפה (אפשר לשחזר 30 יום)' };
    else if (/לארכב|לארכיון|ארכיון|להוציא\sמהתיבה/.test(t)) A = { act: 'archive', he: 'להעביר לארכיון' };
    else if (/כנקרא|כנקראו|כנקראים/.test(t)) A = { act: 'read', he: 'לסמן כנקרא' };
    else if (LIST_WORDS.test(t) || /^\s*כמה\s/.test(t)) A = { act: 'list', he: 'לספור ולהכין רשימה (שולח, תאריך, סכום)' };
    var LISTDO = { q: query, act: 'list', label: '', head: 'רשימה – ' + r.head };
    if (A && A.act === 'list') {
      r.doit = LISTDO; r.act = 'list';
      r.btn = '📊 לספור ולהכין רשימה';
      r.lines.push('ג׳ימייל ייפתח עם החיפוש, והתוסף יעבור על שורות הרשימה (שולח, נושא, תאריך, והסכום אם כתוב בשורה) – בלי לפתוח אף מייל.');
      r.lines.push('ייצוא לאקסל או העתקה לגיליון גוגל – בלחיצה, בחלון הקטן שעל הדף.');
      r.alt.push({ label: '🔎 רק להראות, בלי רשימה', url: r.url });
      r.note = 'רק קריאה של מה שמוצג ברשימה. שום דבר לא משתנה בחשבון ושום דבר לא יוצא מהמחשב.';
      if (isInv) r.alt.push({ label: '🧾 קורא קבלות לרואי חשבון', url: 'https://hakelim.com/kelim/cheshbon/?utm_source=tosaf_cmd' });
      return r;
    }
    if (A && /^files/.test(A.act)) {
      r.act = A.act; r.doit = { q: query, act: A.act, label: '', head: A.he + ' – ' + r.head };
      r.btn = A.act === 'files-drive' ? '📁 להכין: לשמור בדרייב' : '💾 להכין: להוריד למחשב';
      r.lines.push('ג׳ימייל ייפתח עם החיפוש, ובחלון קטן על הדף תראו כמה מיילים נמצאו. רק אחרי "✓ לבצע" התוסף פותח אותם אחד-אחד (עד 25) ולוחץ בשבילכם ' + (A.act === 'files-drive' ? 'על "הוספה לדרייב" של ג׳ימייל ליד כל קובץ.' : 'על "הורדה" ליד כל קובץ.'));
      r.lines.push(A.act === 'files-drive' ? 'הקבצים נכנסים ל"האחסון שלי" בדרייב. לתיקייה – "ארגון" בהודעה של ג׳ימייל, או בדרייב עצמו.' : 'הקבצים נשמרים בתיקיית "הורדות". כרום ישאל פעם אחת אם להרשות הורדה של כמה קבצים – לוחצים "אישור".');
      r.alt.push({ label: '🔎 רק להראות, בלי לשמור', url: r.url });
      if (A.act === 'files-drive') r.alt.push({ label: '📁 לפתוח את הדרייב', url: 'https://drive.google.com/drive/my-drive' });
      r.note = 'שום מייל לא נשלח ולא נמחק. שומרים רק עותק של הקבצים.';
      return r;
    }
    if (isInv && !A) {
      r.doit = null;
      r.alt.unshift({ label: '📊 רשימה לאקסל (שולח, תאריך, סכום)', url: 'doit:list' });
      r.listDo = LISTDO;
    }
    if (A) {
      if (A.act === 'read' && !/is:unread/.test(query)) { query = 'is:unread ' + query; }
      if (A.act === 'archive' && !/\bin:/.test(query)) { query = 'in:inbox ' + query; }
      r.q = query; r.url = gsearch(o, query); r.lines[0] = 'החיפוש: ' + query;
      r.act = A.act; r.label = A.label;
      r.doit = { q: query, act: A.act, label: A.label || '', head: A.he + ' – ' + r.head.replace(/^מיילים\s/, 'מיילים ') };
      r.btn = '✓ להכין בג׳ימייל: ' + A.he;
      r.lines.push('ג׳ימייל ייפתח עם החיפוש, ובחלון קטן על הדף תראו כמה מיילים נמצאו. רק אחרי "✓ לבצע" שם – התוסף לוחץ בשבילכם על כל התוצאות.');
      r.alt.push({ label: '🔎 רק להראות, בלי לבצע', url: r.url });
      r.note = 'ג׳ימייל מציע "ביטול" מיד אחרי. אין שליחה ואין מחיקה לצמיתות.';
    }
    else if (/לחסום|חסימה/.test(t)) { r.act = 'block'; r.lines.push('לחסום: פותחים מייל אחד ← ⋮ למעלה ← "חסימה של…". הבאים יגיעו ישר לספאם.'); }
    if (/להסיר|להוריד\sאותי|ביטול\sהרשמה|לבטל\sהרשמה|רשימות?\sתפוצה|רשימות?\sדיוור/.test(t) && !A) {
      r.act = 'unsub';
      r.lines.push('להסרה: פותחים מייל מהרשימה ← "ביטול הרשמה" ליד שם השולח. או בתוסף: ✂ "להסיר אותי מרשימת הדיוור" על המייל הפתוח.');
      r.alt.unshift({ label: '🗺 מפת שולחים: מי שולח הכי הרבה דיוור', url: 'gmap:' });
    }
    return r;
  }

  // ---------- דרייב ----------
  var DTYPES = [
    [/\spdf\s|פי\sדי\sאף/i, 'pdf', 'PDF'], [/מסמכים|מסמך|וורד|word|דוקס/i, 'document', 'מסמכים'], [/גיליונות|גיליון|גליון|אקסל|excel|שיטס|טבלאות/i, 'spreadsheet', 'גיליונות'],
    [/מצגות|מצגת|פאוורפוינט/i, 'presentation', 'מצגות'], [/תמונות|תמונה|צילומים/, 'image', 'תמונות'], [/סרטונים|סרטון|וידאו|סרטים/, 'video', 'סרטונים'],
    [/תיקיות|תיקייה|תיקיה/, 'folder', 'תיקיות'], [/טפסים|טופס/, 'form', 'טפסים'], [/הקלטות|הקלטה|אודיו|שמע/, 'audio', 'הקלטות'], [/zip|קבצים\sדחוסים|ארכיונים/i, 'archive', 'קבצים דחוסים']
  ];
  function drive(t, typeHint) {
    var r = { svc: 'drive', lines: [], alt: [] }, q = [], what = [], i;
    if (/הכי\sגדולים|גדולים|כבדים|תופסים\s(?:הכי\s)?(?:הרבה\s)?מקום|נפח|לפנות\sמקום|מקום\sבדרייב/.test(t)) {
      r.url = 'https://drive.google.com/drive/quota'; r.head = 'הקבצים הכי גדולים בדרייב – מהגדול לקטן'; r.btn = '📁 לפתוח בדרייב';
      r.lines.push('נפתח "אחסון" של דרייב, ממוין לפי גודל. מוחקים מה שלא צריך ← ריקון האשפה.');
      r.alt.push({ label: '🧹 לפנות מקום בגוגל (מדריך בתוסף)', url: 'ext:panui.html' });
      return r;
    }
    if (/שמחקתי|נמחקו|באשפה|אשפה|לשחזר/.test(t)) { r.url = 'https://drive.google.com/drive/trash'; r.head = 'האשפה של דרייב'; r.btn = '♻ לפתוח את האשפה'; r.lines.push('קבצים שנמחקו נשמרים 30 יום. לחיצה ימנית ← "שחזור".'); return r; }
    var type = typeHint || '';
    if (!type) for (i = 0; i < DTYPES.length; i++) if (DTYPES[i][0].test(t)) { type = DTYPES[i][1]; break; }
    if (type) { q.push('type:' + type); for (i = 0; i < DTYPES.length; i++) if (DTYPES[i][1] === type) what.push(DTYPES[i][2]); }
    var shared = /שיתפו\sאיתי|ששיתפו|ששותפו\sאיתי|משותפים\sאיתי|שותפו\sאיתי|שיתפו\sעימי|shared/.test(t);
    var mine = /שלי|שהעליתי|שיצרתי|בבעלותי/.test(t) && !shared;
    var nm = quoted(t) || ((t.match(new RegExp(/(?:בשם|שנקרא|שנקראים|שקוראים\sלו|שהשם\sשלו|עם\sהשם)\s(.+?)/.source + UNTIL)) || [])[1] || '');
    var about = !nm ? ((t.match(new RegExp(/(?:\sעל|בנושא|עם\sהמילה|שכתוב\sבהם)\s(.+?)/.source + UNTIL)) || [])[1] || '') : '';
    var who = (t.match(/(?:ש|ה)?(\S+)\sשיתפ(?:ה|ו)?\sאיתי/) || [])[1];
    if (who && /^(?:ש|מה|כל|מי|ה)$/.test(who)) who = '';
    var rg = range(t), recent = /אחרונ|לאחרונה|ערכתי|פתחתי/.test(t) && !rg, star = /כוכב|מסומנים/.test(t);
    if (!q.length && !nm && !about && !rg && !star) {
      if (shared) { r.url = 'https://drive.google.com/drive/shared-with-me'; r.head = 'מה שיתפו איתי בדרייב'; r.btn = '📁 לפתוח בדרייב'; r.lines.push('נפתח "שותף איתי" – הכי חדש למעלה.'); return r; }
      if (recent) { r.url = 'https://drive.google.com/drive/recent'; r.head = 'הקבצים האחרונים בדרייב'; r.btn = '📁 לפתוח בדרייב'; r.lines.push('נפתח "אחרונים" – הקובץ שנגעתם בו אחרון למעלה.'); return r; }
      if (mine) { r.url = 'https://drive.google.com/drive/my-drive'; r.head = 'האחסון שלי בדרייב'; r.btn = '📁 לפתוח בדרייב'; r.lines.push('נפתח "האחסון שלי".'); return r; }
    }
    if (shared) { q.push('-owner:me'); what.push(who ? 'ש' + who + ' שיתף' : 'ששיתפו איתי'); if (who) q.push('from:' + who); }
    else if (mine) { q.push('owner:me'); what.push('שלי'); }
    if (star) { q.push('is:starred'); what.push('מסומנים בכוכב'); }
    if (nm) { q.push('title:"' + nm + '"'); what.push('בשם "' + nm + '"'); }
    else if (about) { q.push(about); what.push('על "' + about + '"'); }
    var now = (r._now = arguments[2] || new Date());
    if (rg && rg.newer) { var a = new Date(now); a.setDate(a.getDate() - rg.newer); q.push('after:' + ymd(a)); what.push(daysHe(rg.newer)); }
    else if (rg && rg.older) { var b = new Date(now); b.setDate(b.getDate() - rg.older); q.push('before:' + ymd(b)); what.push(olderHe(rg.older)); }
    delete r._now;
    if (!q.length) return null;
    r.q = q.join(' ');
    r.url = 'https://drive.google.com/drive/search?q=' + encodeURIComponent(r.q);
    r.head = (what.length ? 'בדרייב: ' + what.join(' · ') : 'חיפוש בדרייב');
    r.lines.push('החיפוש: ' + r.q);
    if (recent) r.lines.push('למיין לפי "שינוי אחרון": לוחצים על כותרת העמודה.');
    if (/למחוק|לנקות/.test(t)) r.lines.push('למחוק: מסמנים (Ctrl+A) ← 🗑. אפשר לשחזר מהאשפה 30 יום.');
    r.btn = '🔎 להראות בדרייב';
    return r;
  }

  // ---------- מסמכים, גיליונות, מצגות, טפסים ----------
  var KIND = {
    docs: { p: 'document', nw: 'https://docs.new', name: 'מסמך', type: 'document', icon: '📄' },
    sheets: { p: 'spreadsheets', nw: 'https://sheets.new', name: 'גיליון', type: 'spreadsheet', icon: '📊' },
    slides: { p: 'presentation', nw: 'https://slides.new', name: 'מצגת', type: 'presentation', icon: '📽' },
    forms: { p: 'forms', nw: 'https://forms.new', name: 'טופס', type: 'form', icon: '📝' }
  };
  var KWORD = /(?:ה)?(?:מסמך|מסמכים|דוקס|גוגל\sדוקס|וורד|גיליון|גליון|גיליונות|שיטס|גוגל\sשיטס|אקסל|טבלה|טבלת|מצגת|מצגות|סליידס|טופס|טפסים|סקר|שאלון)(?=\s)/;
  function office(t, svc, now) {
    var k = KIND[svc], r = { svc: svc, lines: [], alt: [] };
    var plural = /מסמכים|גיליונות|מצגות|טפסים/.test(t);
    var isNew = /חדש|חדשה|ליצור|תיצור|צור|להכין|תכין|לפתוח\s(?:\S+\s)?(?:ל|בשם)|בשם|שנקרא/.test(t) && !plural;
    var recent = /אחרון|האחרונ|ערכתי|פתחתי|עבדתי|המסמכים\sשלי|הגיליונות\sשלי|רשימת/.test(t);
    if (/תבנית|תבניות/.test(t)) {
      r.url = 'https://docs.google.com/' + k.p + '/u/0/?ftv=1'; r.head = 'תבניות מוכנות – ' + SVC[svc][1]; r.btn = k.icon + ' לפתוח תבניות';
      r.lines.push('נפתחת גלריית התבניות של גוגל. בוחרים תבנית, והיא נשמרת כעותק שלכם.');
      return r;
    }
    if (recent && !isNew) {
      r.url = 'https://docs.google.com/' + k.p + '/u/0/'; r.head = (svc === 'docs' ? 'המסמך האחרון' : svc === 'sheets' ? 'הגיליון האחרון' : svc === 'slides' ? 'המצגת האחרונה' : 'הטופס האחרון') + ' שפתחתם';
      r.btn = k.icon + ' לפתוח את הרשימה'; r.lines.push('נפתחת הרשימה של ' + SVC[svc][1] + ', מהאחרון שפתחתם. הראשון למעלה הוא האחרון.');
      r.alt.push({ label: '🕘 אחרונים בדרייב', url: 'https://drive.google.com/drive/recent' });
      return r;
    }
    if (!isNew && (plural || range(t) || /שיתפו|ששיתפו|בשם|על\s|כוכב/.test(t))) { var d = drive(t, k.type, now); if (d) return d; }
    // שם ליצירה
    var title = quoted(t);
    if (!title) {
      var m = t.match(/(?:בשם|שנקרא|שייקרא|עם\sהשם|שם:)\s(.+?)\s$/) || t.match(new RegExp(KWORD.source + '(?:\\s(?:חדש|חדשה))?\\s(?:ל-?|של\\s|עבור\\s|בשביל\\s|על\\s)(.+?)\\s$'))
        || t.match(new RegExp(KWORD.source + '\\s(?:חדש|חדשה)\\s(?!בשם|שנקרא)(.+?)\\s$'));
      if (m) title = m[m.length - 1];
    }
    if (title) title = title.replace(/^(?:ל-?|של\s|את\s)/, '').replace(/\s(?:בבקשה|בעברית|בדרייב)$/, '').trim();
    var hebrew = /בעברית|מימין\sלשמאל/.test(t);
    if (svc === 'forms') { r.url = k.nw; }
    else r.url = title ? 'https://docs.google.com/' + k.p + '/create?title=' + encodeURIComponent(title) + (hebrew ? '&hl=iw' : '') : (hebrew ? 'https://docs.google.com/' + k.p + '/create?hl=iw' : k.nw);
    r.head = (svc === 'docs' ? 'מסמך חדש' : svc === 'sheets' ? 'גיליון חדש' : svc === 'slides' ? 'מצגת חדשה' : 'טופס חדש') + (title ? ' בשם "' + title + '"' : '');
    r.title = title;
    r.btn = k.icon + ' ליצור עכשיו';
    r.lines.push(title && svc !== 'forms' ? 'נפתח ' + k.name + ' ריק בדרייב שלכם, וכבר עם השם "' + title + '".' : 'נפתח ' + k.name + ' ריק בדרייב שלכם' + (title ? ' – את השם "' + title + '" כותבים למעלה.' : '. נותנים לו שם למעלה משמאל.'));
    if (svc === 'sheets') {
      r.lines.push('גיליון מימין לשמאל: תפריט "עיצוב" ← "מימין לשמאל".');
      if (/תקציב|הוצאות|הכנסות/.test(t)) r.alt.push({ label: '💰 תקציב משפחתי מוכן', url: 'https://hakelim.com/kesef/taktziv/?utm_source=tosaf_cmd' });
      if (/קניות/.test(t)) r.alt.push({ label: '🛒 רשימת קניות', url: 'https://hakelim.com/bait/kniyot/?utm_source=tosaf_cmd' });
    }
    if (/הצעת\sמחיר/.test(t)) r.alt.push({ label: '🧾 הצעת מחיר מוכנה', url: 'https://hakelim.com/kelim/cheshbon/hatzaa/?utm_source=tosaf_cmd' });
    r.alt.push({ label: '📋 תבניות מוכנות', url: 'https://docs.google.com/' + k.p + '/u/0/?ftv=1' });
    return r;
  }

  // ---------- יומן ----------
  var HEB_CAL = /יומן\sעברי|יומן\sיהודי|תאריך\sעברי|תאריכים\sעבריים|לוח\sעברי|לוח\sשנה\sעברי|חגים\sיהודיים|חגי\sישראל|חגים\s(?:ל|ב)יומן|פרשת\sהשבוע|פרשה\s(?:ל|ב)יומן|פרשות/;
  var HCAL = {
    date: ['📅 תאריך עברי בכל יום', 'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fdownload.hebcal.com%2Fical%2Fhdate-he-v2.ics'],
    hag: ['🕎 חגים יהודיים', 'https://calendar.google.com/calendar/render?cid=iw.jewish%23holiday%40group.v.calendar.google.com'],
    par: ['📖 פרשת השבוע', 'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fdownload.hebcal.com%2Fical%2Ftorah-readings-israel-he.ics']
  };
  function hebCal(t) {
    var k = /פרש/.test(t) ? 'par' : /חג/.test(t) && !/תאריך|יומן\sעברי|לוח\sעברי/.test(t) ? 'hag' : 'date';
    var r = { svc: 'calendar', lines: [], alt: [], hebcal: k };
    r.url = HCAL[k][1]; r.head = 'יומן עברי – ' + HCAL[k][0].slice(3); r.btn = HCAL[k][0].slice(0, 2) + ' להוסיף ליומן שלי';
    r.lines.push(k === 'date' ? 'התאריך העברי יופיע בראש כל יום ביומן – במחשב ובטלפון.' : k === 'hag' ? 'כל החגים והמועדים יופיעו ביומן, בעברית.' : 'פרשת השבוע תופיע בכל שבת ביומן.');
    r.lines.push('נפתח יומן גוגל עם השאלה "להוסיף את לוח השנה?" – לוחצים "הוספה", וזה הכול.');
    Object.keys(HCAL).forEach(function (x) { if (x !== k) r.alt.push({ label: HCAL[x][0], url: HCAL[x][1] }); });
    r.alt.push({ label: '📖 עוד על יומן עברי בגוגל', url: 'https://hakelim.com/kelim/machshev/yoman-ivri/?utm_source=tosaf_cmd' });
    r.note = 'אפשר להוסיף את שלושתם. מסירים בכל רגע: יומן ← לוחות שנה אחרים ← ✕.';
    return r;
  }
  function calendar(t, now) {
    var r = { svc: 'calendar', lines: [], alt: [] }, m;
    now = now || new Date();
    if (HEB_CAL.test(t)) return hebCal(t);
    var view = /מה\sיש\s(?:לי|לנו)|מה\sמתוכנן|מה\sבלו"ז|מה\sביומן|איך\sנראה|להראות\s(?:את\s)?(?:ה)?יומן|לפתוח\s(?:את\s)?(?:ה)?יומן|תראה\s(?:לי\s)?(?:את\s)?(?:ה)?יומן|מה\sקורה\s(?:מחר|היום|השבוע)|אני\sפנוי|אני\sפנויה/.test(t);
    if ((m = t.match(/\s(?:לחפש\sביומן|חיפוש\sביומן|מתי\s(?:ה|יש\s|הייתה\s|היה\s)?)(.+?)\s$/)) && !view) {
      var k = m[1].replace(/^(?:פגישה|הפגישה|האירוע|התור)\s(?:עם\s|של\s|אצל\s)?/, '').trim();
      r.url = 'https://calendar.google.com/calendar/r/search?q=' + encodeURIComponent(k); r.head = 'חיפוש ביומן: "' + k + '"'; r.btn = '🔎 לחפש ביומן';
      r.lines.push('מוצגים כל האירועים עם "' + k + '" – מה שהיה ומה שיהיה.'); r.q = k;
      return r;
    }
    if (view) {
      var y, mo, d, path = 'day', when = W.parse(t, now), dd = when.start || new Date(now);
      if (/השבוע|שבוע\sהבא|בשבוע/.test(t)) { path = 'week'; if (/שבוע\sהבא/.test(t)) dd = new Date(now.getTime() + 7 * 864e5); }
      else if (/החודש|חודש\sהבא/.test(t)) { path = 'month'; if (/חודש\sהבא/.test(t)) { dd = new Date(now); dd.setDate(1); dd.setMonth(dd.getMonth() + 1); } }
      y = dd.getFullYear(); mo = dd.getMonth() + 1; d = dd.getDate();
      r.url = 'https://calendar.google.com/calendar/r/' + path + '/' + y + '/' + mo + '/' + d;
      r.head = path === 'week' ? 'היומן – השבוע של ' + d + '.' + mo : path === 'month' ? 'היומן – חודש ' + mo + '/' + y : 'היומן – יום ' + W.DAYS[dd.getDay()] + ' ' + d + '.' + mo;
      r.btn = '📅 לפתוח את היומן'; r.lines.push('נפתח היומן שלכם בתצוגת ' + (path === 'week' ? 'שבוע' : path === 'month' ? 'חודש' : 'יום') + '. רק להסתכל – שום דבר לא משתנה.');
      return r;
    }
    var w = W.parse(t, now);
    if (!w.start && !/(?:פגישה|פגישת|אירוע|תור|תזכורת|ליומן|ביומן)/.test(t)) return null;
    w.title = (w.title || '').replace(/^(?:ש\s|את\s)/, '').trim() || 'אירוע';
    r.w = w; r.url = W.calendarUrl(w); r.head = '📅 ' + w.title; r.btn = '📅 לפתוח ביומן מוכן';
    r.lines.push('מתי: ' + W.describe(w));
    if (w.guests && w.guests.length) r.lines.push('מוזמנים: ' + w.guests.join(', ') + ' (ההזמנה יוצאת רק כשתלחצו "שמירה" ו"שליחה")');
    else if ((m = w.title.match(/(?:עם|אצל)\s(\S+(?:\s\S+)?)/))) r.lines.push('להזמין את ' + m[1] + '? בחלון שנפתח ← "הוספת אורחים" ← השם או המייל.');
    if (w.remind) r.lines.push('⏰ ' + w.remind + ': גוגל שם תזכורת לפי ברירת המחדל של היומן (בדרך כלל 30 דקות לפני). לשנות – בחלון שנפתח ← "הוספת התראה".');
    r.note = 'נפתח חלון אירוע מוכן ביומן שלכם. שום דבר לא נשמר עד שלוחצים "שמירה".';
    // תזכורת במחשב: התוסף קופץ בשעה שנקבעה (בלי יומן, בלי חשבון)
    if (w.start && (w.remind || /תזכיר|להזכיר|תזכורת/.test(t)) && !w.recur) {
      var at = w.allDay ? new Date(w.start.getFullYear(), w.start.getMonth(), w.start.getDate(), 9, 0) : w.start;
      if (at > now) { r.rem = { at: at.getTime(), text: w.title }; r.alt.unshift({ label: '🔔 רק תזכורת במחשב (' + ('0' + at.getHours()).slice(-2) + ':' + ('0' + at.getMinutes()).slice(-2) + ')', url: 'rem:' }); }
    }
    return r;
  }

  // ---------- אנשי קשר ----------
  function contacts(t) {
    var r = { svc: 'contacts', lines: [], alt: [] }, m;
    if (/כפולים|כפילויות|למזג|מיזוג/.test(t)) { r.url = 'https://contacts.google.com/merge'; r.head = 'אנשי קשר כפולים – למזג'; r.btn = '👥 לפתוח מיזוג'; r.lines.push('גוגל מראה את הכפולים. "מיזוג הכול" או אחד-אחד.'); return r; }
    if (/שמחקתי|לשחזר|נמחק/.test(t)) { r.url = 'https://contacts.google.com/trash'; r.head = 'אנשי קשר שנמחקו'; r.btn = '♻ לפתוח'; r.lines.push('נשמרים 30 יום. בוחרים ← "שחזור".'); return r; }
    if ((m = t.match(/(?:קבוצה|קבוצת\sאנשי\sקשר|תווית)\s(?:חדשה\s)?(?:בשם\s|של\s|ל-?)?(.+?)\s(?:באנשי\sקשר|באנשי\sהקשר)?\s?$/)) && /קבוצ|תווית/.test(t)) {
      var g = m[1].replace(/\s?(?:באנשי\sקשר|באנשי\sהקשר|אנשי\sקשר)$/, '').replace(/^(?:חדשה\s)?(?:בשם\s)?/, '').trim();
      r.url = 'https://contacts.google.com/'; r.head = 'קבוצה חדשה באנשי קשר' + (g ? ': "' + g + '"' : ''); r.btn = '👥 לפתוח אנשי קשר';
      r.lines.push('בצד ימין: "+ יצירת תווית" ← ' + (g ? '"' + g + '"' : 'השם') + ' ← שמירה. אחר כך מסמנים אנשים ← 🏷 ← הקבוצה.');
      r.lines.push('מייל לכל הקבוצה: בג׳ימייל כותבים את שם הקבוצה בשדה "אל".');
      return r;
    }
    if (/חדש|להוסיף|לשמור/.test(t)) { r.url = 'https://contacts.google.com/new'; r.head = 'איש קשר חדש'; r.btn = '👤 לפתוח'; r.lines.push('נפתח טופס ריק – ממלאים ולוחצים "שמירה".'); return r; }
    var q = t.replace(/\s(?:לחפש|תמצא|למצוא|את|ה?טלפון\sשל|המספר\sשל|מה|של|באנשי\sקשר|באנשי\sהקשר|אנשי\sקשר|איש\sקשר)(?=\s)/g, ' ').trim();
    if (q.length > 1) { r.url = 'https://contacts.google.com/search/' + encodeURIComponent(q); r.head = 'חיפוש באנשי קשר: "' + q + '"'; r.btn = '🔎 לחפש'; r.q = q; r.lines.push('רק חיפוש – שום דבר לא משתנה.'); return r; }
    r.url = 'https://contacts.google.com/'; r.head = 'אנשי קשר'; r.btn = '👥 לפתוח'; r.lines.push('נפתחים אנשי הקשר שלכם.'); return r;
  }

  // ---------- מזהים לאיזה שירות הכוונה ----------
  function detect(t) {
    if (/(?:לכתוב|תכתוב|כתוב|לשלוח|תשלח|לנסח|תנסח)\s(?:\S+\s){0,2}(?:מייל|אימייל)(?!ים)/.test(t)) return 'gmail';
    if (HEB_CAL.test(t)) return 'calendar';
    if (FILES_DRIVE.test(t) || FILES_DOWN.test(t) || /מצורפ|צרופות/.test(t)) return 'gmail';
    if (/איש\sקשר|אנשי\sקשר|אנשי\sהקשר|קבוצת\sאנשי|כפולים\sבאנשי|contacts/i.test(t)) return 'contacts';
    var calStrong = /ליומן|ביומן|יומן|תזכיר\sלי|להזכיר\sלי|תזכורת|לקבוע|פגישה|פגישת|תור\s(?:ל|אצל)|יום\sהולדת|מה\sיש\sלי\s(?:מחר|היום|השבוע|ב)|מה\sמתוכנן/;
    if (/דרייב|drive|בדרייב/i.test(t) && !/ליומן|ביומן/.test(t)) {
      if (/(?:מסמך|גיליון|מצגת)\s(?:חדש|חדשה)/.test(t)) return /גיליון/.test(t) ? 'sheets' : /מצגת/.test(t) ? 'slides' : 'docs';
      return 'drive';
    }
    if (calStrong.test(t) && !/(?:מיילים|הודעות\sמייל)/.test(t)) return 'calendar';
    if (/חשבוניות|חשבונית|קבלות|תלושי|תלושים/.test(t) && !/גיליון|גליון|מסמך|מצגת/.test(t)) return 'gmail';
    if (/ג'?ימייל|gmail|מייל|אימייל|דוא"ל|דואר|בתיבה|ניוזלטר|ספאם|דיוור|תווית|תוויות|תפוצה|ארכיון|לארכב|כנקרא|רשתות\sחברתיות|קידומי\sמכירות/i.test(t)) return 'gmail';
    if (/גיליון|גליון|גיליונות|שיטס|sheets|אקסל|excel|טבלה|טבלת/i.test(t)) return 'sheets';
    if (/מצגת|מצגות|slides|פאוורפוינט|פאואר\sפוינט/i.test(t)) return 'slides';
    if (/טופס|טפסים|סקר|שאלון|forms/i.test(t)) return 'forms';
    if (/מסמך|מסמכים|דוקס|docs|וורד/i.test(t)) return 'docs';
    if (/פתק\b|פתק\s|keep/i.test(t)) return 'keep';
    if (/קובץ|קבצים|קבצי|\spdf\s|תיקייה|תיקיות|שיתפו\sאיתי|ששיתפו|ששותפו|הקלטות|סרטונים/i.test(t)) return 'drive';
    if (/מה\sיש\sלי|אירוע|ישיבה|חתונה|ברית|שיעור|אסיפה|calendar/i.test(t)) return 'calendar';
    return '';
  }
  function parse(text, o) {
    o = o || {};
    var now = o.now || new Date(), t = clean(text), svc = o.svc || detect(t), r = null;
    if (t.trim().length < 2) return null;
    if (svc === 'gmail') r = gmail(t, o);
    else if (svc === 'drive') r = drive(t, '', now);
    else if (svc === 'calendar') r = calendar(t, now);
    else if (KIND[svc]) r = office(t, svc, now);
    else if (svc === 'contacts') r = contacts(t);
    else if (svc === 'keep') {
      var body = t.replace(/^\s*(?:לכתוב\sפתק|תכתוב\sפתק|פתק\sחדש|פתק)[:\s-]*/, '').trim();
      r = { svc: 'keep', url: 'https://keep.new', head: 'פתק חדש ב-Keep', btn: '🗒 לפתוח פתק', lines: [body ? 'הטקסט "' + body + '" מועתק – מדביקים בפתק (Ctrl+V).' : 'נפתח פתק ריק ב-Google Keep.'], alt: [], copy: body };
    } else {
      // בלי מילה מפורשת: אם יש זמן – אירוע ביומן
      var w = W.parse(t, now);
      if (w.start) r = calendar(t, now);
    }
    if (!r && svc === 'gmail') r = { svc: 'gmail', url: gmailBase(o), head: 'לא הבנתי מה לחפש בג׳ימייל', lines: ['כותבים ממי, מתי, ועם מה. למשל: "מיילים מבנק הפועלים מהחודש האחרון עם קובץ".'], alt: [], btn: '✉ לפתוח את ג׳ימייל', weak: true };
    if (!r && svc === 'drive') r = { svc: 'drive', url: 'https://drive.google.com/drive/my-drive', head: 'לא הבנתי מה לחפש בדרייב', lines: ['למשל: "קבצי PDF מהשבוע", "מה שיתפו איתי", "הקבצים הכי גדולים", "מסמך בשם חוזה".'], alt: [], btn: '📁 לפתוח את דרייב', weak: true };
    if (!r) return { svc: '', head: 'לא הבנתי לאיזה שירות', lines: ['כותבים מה ואיפה: מייל, יומן, דרייב, מסמך, גיליון. למשל: "פגישה עם משה ביום שלישי בשמונה בערב", "קבצי PDF מהשבוע".'], alt: [], weak: true };
    r.icon = SVC[r.svc][0]; r.name = SVC[r.svc][1];
    return r;
  }
  // דוגמאות חיות לפי שירות: לחיצה ממלאת ומראה מיד מה יקרה
  var GROUPS = [
    ['✉ ג׳ימייל', ['מיילים מבנק הפועלים מהחודש האחרון עם קובץ', 'להעביר לארכיון את כל הדיוור מלפני חודש', 'לסמן בכוכב את כל המיילים מביטוח לאומי', 'להעביר לתווית חשבונות את כל המיילים מחברת חשמל', 'לסמן כנקרא את כל הרשתות החברתיות', 'מיילים שלא עניתי עליהם השבוע', 'להסיר אותי מרשימות תפוצה', 'מיילים גדולים ישנים משנה', 'תווית חדשה בשם ספקים']],
    ['🧾 חשבוניות וקבצים', ['חשבוניות מהחודש', 'כמה חשבוניות קיבלתי השנה', 'רשימת חשבוניות מהשנה לאקסל', 'לשמור את כל החשבוניות לתווית חשבוניות 2026', 'לשמור בדרייב את כל הקבצים המצורפים מביטוח לאומי', 'להוריד למחשב את הקבלות מהחודש', 'מיילים מרשות המסים עם PDF מהשנה']],
    ['📅 יומן', ['פגישה עם משה ביום שלישי בשמונה בערב לשעה, עם תזכורת', 'תזכיר לי מחר בשמונה בבוקר להתקשר לבנק', 'ישיבת צוות כל יום שני בתשע וחצי לחצי שעה', 'תתקין לי יומן עברי', 'חגים יהודיים ליומן', 'פרשת השבוע ביומן', 'מה יש לי מחר ביומן', 'מה מתוכנן השבוע']],
    ['📁 דרייב', ['קבצי PDF מהשבוע', 'הקבצים הכי גדולים בדרייב', 'מה שיתפו איתי בדרייב', 'תמונות ששיתפו איתי מהחודש', 'קובץ בשם חוזה שכירות בדרייב', 'לשחזר קובץ שמחקתי בדרייב']],
    ['📄 מסמכים וגיליונות', ['מסמך חדש בשם הצעת מחיר', 'גיליון חדש לתקציב חודשי', 'לפתוח את המסמך האחרון שערכתי', 'מצגת חדשה', 'טופס חדש להרשמה לחוג', 'תבניות של מסמכים']],
    ['👥 אנשי קשר', ['למזג אנשי קשר כפולים', 'קבוצה חדשה בשם משפחה באנשי קשר', 'איש קשר חדש']]
  ];
  var EX = GROUPS.reduce(function (a, g) { return a.concat(g[1]); }, []);

  // ---------- הממשק: שורה אחת "🧹 מה לעשות?" + 🎤 + תצוגה מקדימה + כפתור ----------
  // opts.open(url, r) – פתיחה. opts.doit(d) – ביצוע בג׳ימייל (אחרי תצוגה). opts.gmap() – מפת שולחים. opts.gmailBase() – החשבון הפתוח.
  // opts.needMic() – לפתוח דף שמבקש רשות למיקרופון (בחלון קטן אי אפשר לבקש).
  function mount(box, opts) {
    opts = opts || {};
    var d = document, mk = function (tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    var store = root.chrome && chrome.storage && chrome.storage.local;
    box.classList.add('hkcmd');
    var form = mk('form', 'hkcmd-f'), lab = mk('label', 'sr', 'מה לעשות בשירותי גוגל, במילים או בדיבור'), inp = mk('input'), mic = mk('button', 'hkcmd-mic', '🎤'), go = mk('button', 'hkcmd-go', '←');
    inp.id = 'hkcmd-q'; lab.htmlFor = 'hkcmd-q'; inp.type = 'text'; inp.autocomplete = 'off'; inp.maxLength = 300;
    inp.placeholder = '🧹 מה לעשות? כותבים או מדברים';
    go.type = 'submit'; go.title = 'להראות מה יקרה'; go.setAttribute('aria-label', 'להראות מה יקרה');
    mic.type = 'button'; mic.title = 'לדבר במקום לכתוב'; mic.setAttribute('aria-label', 'לדבר במקום לכתוב'); mic.setAttribute('aria-pressed', 'false');
    form.appendChild(lab); form.appendChild(inp);
    var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (SR) form.appendChild(mic);
    form.appendChild(go); box.appendChild(form);
    var out = mk('div', 'hkcmd-out'); out.setAttribute('role', 'status'); out.setAttribute('aria-live', 'polite'); box.appendChild(out);
    var cur = null, shownFor = '', grp = 0;
    // "דוגמה חיה" בשורה הריקה: משפט מוקלד אות אחר אות, עד שמתחילים לכתוב
    var demoI = 0, demoC = 0, demoT = null;
    function demo() {
      if (d.activeElement === inp || inp.value) { inp.placeholder = '🧹 מה לעשות? כותבים או מדברים'; return; }
      var s = EX[demoI % EX.length];
      demoC++;
      inp.placeholder = '🧹 ' + s.slice(0, demoC) + (demoC < s.length ? '▍' : '');
      if (demoC >= s.length + 25) { demoC = 0; demoI++; }
    }
    demoT = setInterval(demo, 70);
    function exChips() {
      out.textContent = '';
      var tabs = mk('div', 'hkcmd-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'דוגמאות לפי שירות');
      GROUPS.forEach(function (g, i) {
        var b = mk('button', '', g[0]); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === grp ? 'true' : 'false');
        b.addEventListener('click', function () { grp = i; exChips(); }); tabs.appendChild(b);
      });
      out.appendChild(tabs);
      var c = mk('div', 'hkcmd-ex');
      GROUPS[grp][1].forEach(function (x) { var b = mk('button', '', x); b.type = 'button'; b.addEventListener('click', function () { inp.value = x; show(); }); c.appendChild(b); });
      out.appendChild(c);
      out.appendChild(mk('p', 'hkcmd-hint', 'לוחצים על דוגמה ורואים בדיוק מה יקרה – ורק בלחיצה שלכם זה קורה. הכול מפוענח במחשב שלכם, בלי שרת.' + (SR ? ' 🎤 = לדבר במקום לכתוב.' : '')));
      remList();
    }
    function remList() {
      if (!store) return;
      store.get('hkRem').then(function (o) {
        var L = (o.hkRem || []).filter(function (x) { return x.at > Date.now(); }).sort(function (a, b) { return a.at - b.at; });
        if (!L.length || inp.value.trim()) return;
        var w = mk('div', 'hkcmd-rems'); w.appendChild(mk('b', '', '🔔 תזכורות במחשב'));
        L.slice(0, 6).forEach(function (x) {
          var row = mk('div', 'hkcmd-rem'), dt = new Date(x.at);
          row.appendChild(mk('span', '', W.DAYS[dt.getDay()] + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1) + ' ' + ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2) + ' · ' + x.text));
          var del = mk('button', '', '✕'); del.type = 'button'; del.setAttribute('aria-label', 'למחוק את התזכורת ' + x.text);
          del.addEventListener('click', function () { try { chrome.runtime.sendMessage({ hkRem: { id: x.id, cancel: true } }, function () { void chrome.runtime.lastError; setTimeout(exChips, 150); }); } catch (e) {} });
          row.appendChild(del); w.appendChild(row);
        });
        out.appendChild(w);
      }).catch(function () {});
    }
    function say(t) { var p = out.querySelector('.hkcmd-said'); if (!p) { p = mk('p', 'hkcmd-said'); out.appendChild(p); } p.textContent = t; }
    function open(url, r) {
      if (/^rem:/.test(url)) {
        var R = cur && cur.rem; if (!R) return;
        try { chrome.runtime.sendMessage({ hkRem: { id: 'r' + Date.now(), at: R.at, text: R.text } }, function (res) { void chrome.runtime.lastError; var dt = new Date(R.at); say('🔔 נקבע: ' + R.text + ' – יום ' + W.DAYS[dt.getDay()] + ' ' + ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2) + '. חלון יקפוץ במחשב בזמן הזה (כשכרום פתוח).'); }); } catch (e) {}
        return;
      }
      if (/^gmap:/.test(url)) { if (opts.gmap) opts.gmap(); return; }
      if (/^doit:/.test(url)) { if (cur && cur.listDo && opts.doit) opts.doit(cur.listDo); return; }
      if (/^ext:/.test(url)) url = chrome.runtime.getURL(url.slice(4));
      if (r && r.copy && navigator.clipboard) navigator.clipboard.writeText(r.copy).catch(function () {});
      (opts.open || function (u) { window.open(u, '_blank'); })(url, r);
    }
    function run(r) { if (r.doit && opts.doit) opts.doit(r.doit); else open(r.url, r); }
    function show() {
      var v = inp.value.trim();
      if (!v) { cur = null; exChips(); return; }
      cur = parse(v, { gmailBase: opts.gmailBase && opts.gmailBase() }); shownFor = v;
      out.textContent = '';
      var card = mk('div', 'hkcmd-card' + (cur.weak ? ' weak' : ''));
      card.appendChild(mk('b', 'hkcmd-h', (cur.icon ? cur.icon + ' ' + cur.name + ' · ' : '🤔 ') + cur.head.replace(/^📅\s/, '')));
      var ul = mk('ul'); (cur.lines || []).forEach(function (l) { ul.appendChild(mk('li', '', l)); }); card.appendChild(ul);
      if (cur.note) card.appendChild(mk('p', 'hkcmd-note', cur.note));
      if (cur.url) {
        var row = mk('div', 'hkcmd-acts'), b = mk('button', 'hkcmd-run', (cur.btn || 'לפתוח') + (cur.doit ? '' : ' ↗')); b.type = 'button';
        var c0 = cur; b.addEventListener('click', function () { run(c0); }); row.appendChild(b);
        (cur.alt || []).forEach(function (a) { var x = mk('button', 'hkcmd-alt', a.label); x.type = 'button'; x.addEventListener('click', function () { open(a.url, a); }); row.appendChild(x); });
        card.appendChild(row);
      }
      out.appendChild(card);
      if (cur.weak) { var back = mk('button', 'hkcmd-alt', '💡 דוגמאות'); back.type = 'button'; back.addEventListener('click', function () { inp.value = ''; exChips(); inp.focus(); }); out.appendChild(back); }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Enter ראשון מראה, Enter שני על אותו טקסט מבצע
      if (cur && cur.url && shownFor === inp.value.trim() && !cur.weak) run(cur); else show();
    });
    inp.addEventListener('input', function () { if (!inp.value.trim()) exChips(); });
    inp.addEventListener('focus', function () { inp.placeholder = '🧹 מה לעשות? כותבים או מדברים'; if (!inp.value.trim() && !out.firstChild) exChips(); });
    // ---------- דיבור ----------
    // עדיף פענוח בתוך המחשב (כרום חדש). אם אין – כרום שולח את הקול לשירות הדיבור של גוגל, כמו בחיפוש הקולי. אצלנו לא נשמר כלום.
    var rec = null, listening = false;
    function micState(on) { listening = on; mic.textContent = on ? '⏺' : '🎤'; mic.classList.toggle('on', on); mic.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    function startRec(local) {
      rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      if (local) try { rec.processLocally = true; } catch (e) {}
      var finalTxt = '';
      rec.onresult = function (e) {
        var txt = '', fin = false;
        for (var i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
        inp.value = txt.trim(); finalTxt = fin ? inp.value : finalTxt;
        if (fin) show();
      };
      rec.onerror = function (e) {
        micState(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { say('🎤 צריך לאשר מיקרופון פעם אחת. נפתח דף קטן – לוחצים שם "אישור", וחוזרים ללחוץ 🎤.'); if (opts.needMic) opts.needMic(); }
        else if (e.error === 'no-speech') say('🎤 לא שמעתי. לוחצים 🎤 ומדברים מיד.');
        else if (e.error === 'language-not-supported' && local) startRec(false);
        else if (e.error === 'network') say('🎤 אין חיבור לשירות הדיבור. אפשר לכתוב במקום.');
        else if (e.error !== 'aborted') say('🎤 הדיבור לא עבד (' + e.error + '). אפשר לכתוב במקום.');
      };
      rec.onend = function () { micState(false); if (inp.value.trim() && !finalTxt) show(); };
      try { rec.start(); micState(true); if (!out.firstChild || !inp.value) say('🎤 מקשיב… מדברים בעברית, למשל: "' + EX[Math.floor(Math.random() * EX.length)] + '"'); } catch (e) { micState(false); }
    }
    mic.addEventListener('click', function () {
      if (listening && rec) { try { rec.stop(); } catch (e) {} return; }
      inp.value = '';
      var tryLocal = typeof SR.available === 'function';
      if (!tryLocal) { startRec(false); return; }
      try {
        SR.available({ langs: ['he-IL'], processLocally: true }).then(function (st) { startRec(st === 'available'); }, function () { startRec(false); });
      } catch (e) { startRec(false); }
    });
    return { input: inp, show: show };
  }
  root.HKCmd = { parse: parse, detect: function (x) { return detect(clean(x)); }, mount: mount, EX: EX, GROUPS: GROUPS, _range: function (x) { return range(clean(x)); }, _sender: function (x) { return sender(clean(x)); } };
})(typeof self !== 'undefined' ? self : this);
