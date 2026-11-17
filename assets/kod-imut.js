/* מנוע זיהוי קוד אימות – מיזם הכלים של גילעד רחמים
 * מוצא קוד חד-פעמי מתוך טקסט חופשי (SMS, ווטסאפ, מייל, התראה, או תמלול של שיחה קולית).
 * רץ רק במכשיר: לא שולח, לא שומר, לא כותב ללוג.
 * אותו היגיון בדיוק נמצא באפליקציה (OtpParser.java), ושניהם נבדקים מול tools/data/kod-imut-samples.json.
 * שימוש: KodImut.detect(text) -> {code, confidence:'high'|'medium', sender, link} או {code:null, link} או null.
 */
(function (root) {
  'use strict';

  // ---- מילים -> ספרות (עברית ואנגלית, כולל מה שזיהוי דיבור מחזיר) ----
  var DIGIT_WORDS = {
    'אפס': '0', 'אחת': '1', 'אחד': '1', 'שתיים': '2', 'שתים': '2', 'שניים': '2', 'שנים': '2', 'שתי': '2', 'שני': '2',
    'שלוש': '3', 'שלש': '3', 'שלושה': '3', 'ארבע': '4', 'ארבעה': '4', 'חמש': '5', 'חמישה': '5',
    'שש': '6', 'שישה': '6', 'שבע': '7', 'שבעה': '7', 'שמונה': '8', 'תשע': '9', 'תשעה': '9',
    'zero': '0', 'oh': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
  };

  function wordDigit(w) {
    w = w.toLowerCase();
    if (DIGIT_WORDS[w]) return DIGIT_WORDS[w];
    if (w.length > 2 && w.charAt(0) === 'ו' && DIGIT_WORDS[w.slice(1)]) return DIGIT_WORDS[w.slice(1)]; // "ושבע"
    if (/^[0-9]$/.test(w)) return w;
    return null;
  }

  // רצף של 4 עד 8 "ספרות במילים" (מותר גם ספרה בודדת בתוך הרצף) -> מחרוזת ספרות
  function spokenToDigits(text) {
    var tokens = text.split(/[\s,.\-–־]+/);
    var out = [], run = [];
    function flush() { if (run.length >= 4 && run.length <= 8 && run.some(function (t) { return !/^[0-9]$/.test(t.w); })) out.push(run.map(function (t) { return t.d; }).join('')); run = []; }
    for (var i = 0; i < tokens.length; i++) {
      var w = tokens[i].replace(/^[^\wא-ת]+|[^\wא-ת]+$/g, '');
      if (!w) continue;
      var d = wordDigit(w);
      if (d !== null) run.push({ w: w, d: d }); else flush();
    }
    flush();
    return out;
  }

  // ---- מילות מפתח ----
  var KEY_RE = /(קוד|סיסמ[הא]|סיסמת|OTP|code|passcode|PIN|verification|verify|אימות|הזדהות|כניסה|זיהוי|הקוד|token|קוד\s*חד)/i;
  var STRONG_KEY_RE = /(קוד\s*(ה)?אימות|קוד\s*(ה)?כניסה|קוד\s*(ה)?זיהוי|קוד\s*חד[\s-]*פעמי|סיסמ[הא]\s*חד[\s-]*פעמית|קוד\s*אבטחה|הקוד\s*(שלך|שלכם|שלכן|הוא|הינו)|קוד\s*ל?אישור|קוד\s*:|OTP|verification\s*code|security\s*code|login\s*code|sign[-\s]?in\s*code|one[-\s]?time|your\s*code|code\s*is|code\s*:|passcode|PIN)/i;

  var KNOWN_SENDERS = [
    'Google', 'WhatsApp', 'PayPal', 'Microsoft', 'Apple', 'Facebook', 'Instagram', 'Telegram', 'Amazon', 'AliExpress',
    'Netflix', 'Spotify', 'TikTok', 'Uber', 'Wolt', 'Bit', 'PayBox', 'Discord', 'LinkedIn', 'X', 'Twitter', 'Yahoo', 'Samsung', 'Zoom',
    'ביטוח לאומי', 'רשות המסים', 'רשות המיסים', 'gov.il', 'משרד החינוך', 'משרד הפנים', 'משרד הבריאות', 'משרד התחבורה',
    'כללית', 'מכבי', 'מאוחדת', 'לאומית', 'בנק לאומי', 'לאומי', 'הפועלים', 'דיסקונט', 'מזרחי טפחות', 'מזרחי', 'הבינלאומי', 'יהב', 'ירושלים', 'מרכנתיל', 'פאגי', 'וואן זירו',
    'ישראכרט', 'מקס', 'כאל', 'אמריקן אקספרס', 'דואר ישראל', 'בזק', 'סלקום', 'פרטנר', 'פלאפון', 'הוט', '019', 'גולן טלקום', 'רמי לוי תקשורת', 'וי ספרינג',
    'עיריית ירושלים', 'עיריית תל אביב', 'עירייה', 'הראל', 'מגדל', 'כלל', 'הפניקס', 'מנורה', 'שופרסל', 'רב קו', 'פנגו', 'סלופארק', 'גט', 'יס', 'סטינג'
  ];

  var URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  var LINK_HINT_RE = /(לאישור|לאמת|אימות|אמת\s|אשר\s|להשלמת|להפעלת|verify|confirm|activate|validate|magic\s*link|sign\s*in)/i;

  // ---- מה לא קוד ----
  function isExcluded(text, start, end, raw) {
    var before = text.slice(Math.max(0, start - 16), start);
    var after = text.slice(end, end + 12);
    var b30 = text.slice(Math.max(0, start - 32), start);
    // סכומים
    if (/[₪$€£]\s*$/.test(before) || /^\s*(₪|ש"ח|ש״ח|שח\b|שקל|NIS|ILS|USD|\$|€|אג['׳]|אגורות|ils|nis)/i.test(after)) return 'amount';
    if (/(סך|סכום|בסך|יתרה|חיוב|תשלום|amount|total|balance)\s*:?\s*$/i.test(before) && !STRONG_KEY_RE.test(before)) return 'amount';
    if (/^[.,]\d/.test(after) || /\d[.,]$/.test(before)) return 'amount';
    // שעה / תאריך
    if (/^\s*[:/.]\s*\d/.test(after) || /\d\s*[:/]\s*$/.test(before)) return 'datetime';
    if (/\d\.\s*$/.test(before)) return 'datetime';
    if (/^(19|20)\d\d$/.test(raw) && !STRONG_KEY_RE.test(b30)) return 'year';
    // טלפון
    if (/^0(5\d|[2-489]|7\d)\d{7}$/.test(raw.replace(/[\s-]/g, '')) || /^\+?972/.test(raw)) return 'phone';
    if (/(\+972|\+\d{1,3})[\s-]*$/.test(before)) return 'phone';
    if (/(^|[^\d])0\d{1,2}-\s*$/.test(before)) return 'phone';
    if (/^\s*-\s*\d{3,}/.test(after) && raw.length <= 3) return 'phone';
    if (/\*\s*$/.test(before) && raw.length <= 5 && !STRONG_KEY_RE.test(b30)) return 'shortcode';
    if (/(טלפון|טל['׳]|נייד|חייגו|התקשרו|לחייג|לבירורים|phone|call)\s*:?\s*$/i.test(b30) && !STRONG_KEY_RE.test(b30)) return 'phone';
    // 4 ספרות אחרונות של כרטיס
    if (/(המסתיים|המסתיימת|שמסתיים|מסתיים|ending|ends)\s*(ב-?|ב|in|with)?\s*-?\s*$/i.test(before) || /(\*{2,}|x{2,}|•{2,})\s*-?\s*$/i.test(before)) return 'card';
    if (/(כרטיס|כרטיסך|card)[^.\n]{0,14}$/i.test(b30) && raw.length === 4 && !STRONG_KEY_RE.test(b30)) return 'card';
    return null;
  }

  function senderOf(text) {
    var best = null, bestAt = 1e9;
    for (var i = 0; i < KNOWN_SENDERS.length; i++) {
      var s = KNOWN_SENDERS[i];
      var re = new RegExp('(^|[^\\wא-ת])' + (/^[א-ת]/.test(s) ? '[בלמוהש]?-?' : '') + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\wא-ת])', s === 'X' ? '' : 'i');
      var m = re.exec(text);
      if (m && m.index < bestAt) { best = s; bestAt = m.index; }
    }
    if (best) return best;
    var m2 = /^\s*\[?([A-Za-zא-ת0-9.\- ]{2,22})\]?\s*:\s/.exec(text);
    if (m2 && !KEY_RE.test(m2[1]) && !/^(שלום|היי|הי|hi|hello|hey|dear|תזכורת|הודעה|note)(\s|$)/i.test(m2[1].trim())) return m2[1].trim();
    return null;
  }

  function findLink(text) {
    if (!LINK_HINT_RE.test(text)) return null;
    var m, links = [];
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) links.push(m[0].replace(/[).,;!?]+$/, ''));
    if (!links.length) return null;
    // מעדיפים קישור שיש בו מילה של אימות
    for (var i = 0; i < links.length; i++) if (/(verif|confirm|activate|auth|login|signin|magic|token|otp|valid)/i.test(links[i])) return links[i];
    return links[0];
  }

  // ---- מועמדים ----
  function candidates(text) {
    var list = [];
    var noUrls = text.replace(URL_RE, function (u) { return new Array(u.length + 1).join(' '); });
    var m;
    // פורמט WebOTP: "@example.com #123456"
    var web = /@[\w.-]+\s+#([A-Za-z0-9]{4,10})\b/.exec(noUrls);
    if (web) list.push({ raw: web[1], code: web[1], start: web.index + web[0].indexOf('#') + 1, end: web.index + web[0].length, webotp: true });
    // ספרות בקבוצות שוות עם רווח/מקף: 123 456 / 123-456 / 1234 5678 / 12 34 56 / 5 8 2 9 1 0
    var spaced = /(^|[^\d\-+/.:,])(\d{1,4}(?:[ \-]\d{1,4}){1,7})(?![\d\-/.:])/g;
    while ((m = spaced.exec(noUrls))) {
      var grp = m[2].split(/[ \-]/), glen = grp[0].length, digits = grp.join('');
      if (!grp.every(function (g) { return g.length === glen; })) continue; // 03-1234567 וכד'
      if (digits.length < 4 || digits.length > 8) continue;
      var s0 = m.index + m[1].length;
      list.push({ raw: m[2], code: digits, start: s0, end: s0 + m[2].length, spaced: true });
    }
    // 4–8 ספרות רצופות
    var plain = /(\d+)/g;
    while ((m = plain.exec(noUrls))) {
      var r = m[1];
      if (r.length < 4 || r.length > 8) continue;
      if (/[A-Za-z]/.test(noUrls.charAt(m.index - 1)) || /[A-Za-z]/.test(noUrls.charAt(m.index + r.length))) continue; // חלק מקוד של אותיות+ספרות
      if (/[A-Z]-$/.test(noUrls.slice(Math.max(0, m.index - 2), m.index))) continue; // G-482913
      if (list.some(function (c) { return c.spaced && m.index >= c.start && m.index < c.end; })) continue; // כבר חלק מקבוצה
      list.push({ raw: r, code: r, start: m.index, end: m.index + r.length });
    }
    // אותיות גדולות + ספרות: G-482913, A1B2C3, ABC-123
    var alnum = /(^|[^A-Za-z0-9])([A-Z]{1,3}-\d{4,8}|(?=[A-Z0-9]{5,8}\b)(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{5,8}|[A-Z0-9]{3,4}-[A-Z0-9]{3,4})(?![A-Za-z0-9])/g;
    while ((m = alnum.exec(noUrls))) {
      var a = m[2];
      if (!/\d/.test(a) || !/[A-Z]/.test(a)) continue;
      var st = m.index + m[1].length;
      var code = /^[A-Z]{1,3}-\d+$/.test(a) ? a : a.replace('-', '');
      list.push({ raw: a, code: code, start: st, end: st + a.length, alnum: true });
    }
    return list;
  }

  function score(text, c) {
    var s = 0;
    var len = c.code.replace(/\D/g, '').length || c.code.length;
    if (c.webotp) s += 12;
    if (len === 6) s += 3; else if (len === 4 || len === 5) s += 2; else s += 1;
    var before = text.slice(Math.max(0, c.start - 48), c.start);
    var after = text.slice(c.end, c.end + 48);
    var nearB = text.slice(Math.max(0, c.start - 22), c.start);
    if (STRONG_KEY_RE.test(before) || STRONG_KEY_RE.test(after.slice(0, 42))) s += 6;
    else if (KEY_RE.test(before) || KEY_RE.test(after.slice(0, 30))) s += 4;
    if (/(קוד|code|סיסמ[הא]|OTP|PIN|הוא|is|:)\s*[:\-–]?\s*["'«]?\s*$/i.test(nearB)) s += 3;
    if (/^\s*(הוא|הינו|is|זה)\s*(קוד|ה?קוד|your|the|code)/i.test(after)) s += 3;
    if (/^\s*[.\n]?\s*$/.test(text.slice(c.end, c.end + 2)) && /[:]\s*$/.test(nearB)) s += 1;
    if (/(הזמנה|הזמנתך|order|אסמכתא|אסמכתה|לקוח|תיק|חשבונית|invoice|ticket|פנייה|מספר\s*הפנייה|reference|ref\.?|tracking|משלוח)\s*(מס['׳]?|מספר|#|no\.?|number)?\s*:?\s*#?\s*$/i.test(before.slice(-28))) s -= 7;
    if (/(ת\.?ז|תעודת זהות|ח\.?פ|ת\.ד|מיקוד|zip|רחוב|דירה|קומה|סניף|branch|חשבון מס['׳]?|account)\s*:?\s*$/i.test(before.slice(-20))) s -= 7;
    if (c.alnum && !/(code|קוד|OTP|PIN|אימות)/i.test(before + after)) s -= 4;
    return s;
  }

  function onlyCodeLike(text) {
    // הטקסט כולו הוא קוד (מדביקים רק "482913" או מקריאים "ארבע שמונה שתיים")
    var t = text.trim();
    if (/(^|\s)[A-Za-zא-ת]{2,}(\s|$)/.test(t)) return false; // "OTP 9920" – יש מילה
    return /^[A-Z0-9][A-Z0-9 \-]{2,10}[A-Z0-9]$/i.test(t) && /\d/.test(t) && t.replace(/[\s-]/g, '').length >= 4 && t.replace(/[\s-]/g, '').length <= 8;
  }

  function detect(text) {
    if (text == null) return null;
    text = String(text).replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/ /g, ' ');
    if (!text.trim()) return null;
    var link = findLink(text);
    var sender = senderOf(text);

    // 1. הטקסט כולו הוא קוד
    if (onlyCodeLike(text)) {
      var only = text.trim().replace(/[\s-]/g, '');
      return { code: /^[A-Z]{1,3}\d+$/.test(only) && /-/.test(text) ? text.trim() : only, confidence: 'high', sender: null, link: null };
    }

    // 2. מועמדים בספרות
    var list = candidates(text);
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var why = c.webotp ? null : isExcluded(text, c.start, c.end, c.raw.replace(/\s/g, ''));
      if (c.spaced && why === 'phone') why = null;
      if (why) continue;
      c.score = score(text, c);
      if (!best || c.score > best.score || (c.score === best.score && c.spaced && !best.spaced)) best = c;
    }
    // מועמד "רווח" ומועמד רגיל על אותו מקום – לוקחים את הארוך
    if (best && best.score >= 7) {
      return { code: best.code, confidence: best.score >= 9 ? 'high' : 'medium', sender: sender, link: link };
    }

    // 3. קוד במילים (שיחה קולית או "ארבע שבע אחת תשע")
    var spoken = spokenToDigits(text);
    if (spoken.length) {
      var hasKey = KEY_RE.test(text);
      var wordsOnly = text.replace(/[\s,.\-–־]+/g, ' ').trim().split(' ').length <= spoken[0].length + 3;
      if (hasKey || wordsOnly) return { code: spoken[0], confidence: hasKey ? 'high' : 'medium', sender: sender, link: link };
    }

    if (best && best.score >= 5 && KEY_RE.test(text)) {
      return { code: best.code, confidence: 'medium', sender: sender, link: link };
    }
    if (link) return { code: null, confidence: 'high', sender: sender, link: link };
    return null;
  }

  var api = { detect: detect, spokenToDigits: spokenToDigits, version: '1.0.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KodImut = api;
})(typeof window !== 'undefined' ? window : this);
