// זיהוי מספר טלפון (/kelim/machshev/mi-mitkasher/).
// הכול רץ בדפדפן: המספר לא נשלח לשום מקום. רק בלחיצה על כפתור חיפוש הוא נפתח בווטסאפ / טלגרם / גוגל.
// המנוע (MI.check) כתוב כך שאפשר לטעון אותו גם ב-node (module.exports בסוף) – לבוט.
(function (root) {
  'use strict';

  var MOBILE = { '50': 'פלאפון', '51': 'We4G (אקספון)', '52': 'סלקום', '53': 'הוט מובייל', '54': 'פרטנר', '55': 'מפעיל קטן (רמי לוי, הוט ועוד)', '58': 'גולן טלקום' };
  var PAL = { '56': 'Ooredoo (רשת פלסטינית)', '59': 'Jawwal (רשת פלסטינית)' };
  var AREA = { '2': 'ירושלים והסביבה', '3': 'תל אביב וגוש דן', '4': 'חיפה והצפון', '8': 'הדרום והשפלה', '9': 'השרון' };
  var SHORT = { '100': 'משטרה', '101': 'מגן דוד אדום', '102': 'כבאות והצלה', '103': 'חברת החשמל', '104': 'פיקוד העורף', '105': 'המוקד להגנה על ילדים ברשת', '106': 'מוקד עירוני' };
  var CC = {
    '1': 'ארה"ב / קנדה', '7': 'רוסיה / קזחסטן', '20': 'מצרים', '27': 'דרום אפריקה', '30': 'יוון', '31': 'הולנד', '32': 'בלגיה', '33': 'צרפת', '34': 'ספרד', '36': 'הונגריה', '39': 'איטליה',
    '40': 'רומניה', '41': 'שווייץ', '43': 'אוסטריה', '44': 'בריטניה', '45': 'דנמרק', '46': 'שוודיה', '47': 'נורווגיה', '48': 'פולין', '49': 'גרמניה',
    '51': 'פרו', '52': 'מקסיקו', '54': 'ארגנטינה', '55': 'ברזיל', '56': 'צ\'ילה', '57': 'קולומביה', '58': 'ונצואלה', '60': 'מלזיה', '61': 'אוסטרליה', '62': 'אינדונזיה', '63': 'הפיליפינים', '64': 'ניו זילנד', '65': 'סינגפור', '66': 'תאילנד',
    '81': 'יפן', '82': 'דרום קוריאה', '84': 'וייטנאם', '86': 'סין', '90': 'טורקיה', '91': 'הודו', '92': 'פקיסטן', '93': 'אפגניסטן', '94': 'סרי לנקה', '95': 'מיאנמר', '98': 'איראן',
    '212': 'מרוקו', '213': 'אלג\'יריה', '216': 'תוניסיה', '218': 'לוב', '220': 'גמביה', '221': 'סנגל', '222': 'מאוריטניה', '223': 'מאלי', '224': 'גינאה', '225': 'חוף השנהב', '226': 'בורקינה פאסו', '227': 'ניז\'ר', '228': 'טוגו', '229': 'בנין',
    '231': 'ליבריה', '232': 'סיירה לאון', '233': 'גאנה', '234': 'ניגריה', '235': 'צ\'אד', '237': 'קמרון', '241': 'גבון', '242': 'קונגו', '243': 'הרפובליקה הדמוקרטית של קונגו', '247': 'האי אסנשן', '249': 'סודאן', '251': 'אתיופיה', '252': 'סומליה', '254': 'קניה', '255': 'טנזניה', '256': 'אוגנדה', '260': 'זמביה', '263': 'זימבבואה', '269': 'קומורו',
    '351': 'פורטוגל', '352': 'לוקסמבורג', '353': 'אירלנד', '355': 'אלבניה', '356': 'מלטה', '357': 'קפריסין', '358': 'פינלנד', '359': 'בולגריה', '370': 'ליטא', '371': 'לטביה', '372': 'אסטוניה', '373': 'מולדובה', '374': 'ארמניה', '375': 'בלארוס', '380': 'אוקראינה', '381': 'סרביה', '385': 'קרואטיה', '386': 'סלובניה',
    '420': 'צ\'כיה', '421': 'סלובקיה', '852': 'הונג קונג', '855': 'קמבודיה', '880': 'בנגלדש', '881': 'טלפון לווייני', '882': 'רשת בינלאומית מיוחדת', '883': 'רשת בינלאומית מיוחדת',
    '960': 'האיים המלדיביים', '961': 'לבנון', '962': 'ירדן', '963': 'סוריה', '964': 'עיראק', '965': 'כווית', '966': 'סעודיה', '967': 'תימן', '968': 'עומאן', '970': 'הרשות הפלסטינית', '971': 'איחוד האמירויות', '973': 'בחריין', '974': 'קטאר', '976': 'מונגוליה', '977': 'נפאל', '992': 'טג\'יקיסטן', '993': 'טורקמניסטן', '994': 'אזרבייג\'ן', '995': 'גאורגיה', '996': 'קירגיזסטן', '998': 'אוזבקיסטן'
  };
  // מדינות ורשתות שמוכרות בעוקץ "צלצול אחד" (מחזירים שיחה ומשלמים הרבה)
  var WANGIRI = ['216', '222', '224', '225', '231', '232', '234', '247', '252', '269', '881', '882', '883', '243', '237', '373', '355'];
  // קידומות אזור בצפון אמריקה שנראות כמו ארה"ב אבל הן איים בקריביים (שיחה בתשלום גבוה)
  var CARIB = { '268': 'אנטיגואה', '284': 'איי הבתולה הבריטיים', '345': 'איי קיימן', '441': 'ברמודה', '473': 'גרנדה', '649': 'איי טרקס וקייקוס', '664': 'מונטסראט', '758': 'סנט לוסיה', '767': 'דומיניקה', '784': 'סנט וינסנט', '809': 'הרפובליקה הדומיניקנית', '829': 'הרפובליקה הדומיניקנית', '849': 'הרפובליקה הדומיניקנית', '868': 'טרינידד וטובגו', '869': 'סנט קיטס', '876': 'ג\'מייקה' };

  function fmtIL(d) { // d = מספר מקומי עם 0
    if (/^05\d{8}$/.test(d) || /^07\d{8}$/.test(d)) return d.slice(0, 3) + '-' + d.slice(3);
    if (/^0[2-489]\d{7}$/.test(d)) return d.slice(0, 2) + '-' + d.slice(2);
    if (/^1\d{9}$/.test(d)) return d.slice(0, 1) + '-' + d.slice(1, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7);
    return d;
  }

  // מקבל כל צורה של מספר, מחזיר אובייקט עם סוג, הסבר, רמת אזהרה וקישורי חיפוש
  function check(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    var star = /^\*\s*\d{3,5}$/.test(s.replace(/[\s-]/g, ''));
    var plus = /^\s*(\+|00)/.test(s);
    var digits = s.replace(/\D/g, '');
    if (/^\s*00/.test(s)) digits = digits.slice(2);
    if (!digits) return null;
    var r = { input: s, facts: [], level: 'ok', levelText: 'לא נמצאו סימני אזהרה', intl: '', local: '', display: '', kind: '', country: 'ישראל', israeli: true };
    function warn(t) { warnOn(r, t); }
    function bad(t) { badOn(r, t); }

    if (star) {
      var n = s.replace(/\D/g, '');
      r.kind = 'מספר כוכבית של עסק';
      r.display = '*' + n; r.local = '*' + n;
      r.facts.push('מספרי כוכבית שייכים לעסקים ולמוקדי שירות בישראל. חיפוש בגוגל יראה של מי.');
      return finish(r);
    }
    if (!plus && SHORT[digits]) {
      r.kind = SHORT[digits]; r.display = digits; r.local = digits;
      r.facts.push('מספר חירום ושירות רשמי.');
      return finish(r);
    }
    // ישראלי בצורה בינלאומית
    if ((plus || digits.length >= 11) && digits.indexOf('972') === 0) { digits = '0' + digits.slice(3).replace(/^0/, ''); plus = false; }
    if (plus) return intl(r, digits);
    if (digits.length >= 8 && digits[0] !== '0' && digits[0] !== '1') digits = '0' + digits; // שכחו את ה-0

    r.local = digits; r.display = fmtIL(digits); r.intl = digits[0] === '0' ? '972' + digits.slice(1) : '';
    var p2 = digits.slice(1, 3);
    if (/^05\d{8}$/.test(digits)) {
      if (PAL[p2]) { r.kind = 'טלפון נייד – ' + PAL[p2]; r.facts.push('רשת סלולרית של הרשות הפלסטינית.'); }
      else if (MOBILE[p2]) {
        r.kind = 'טלפון נייד';
        r.facts.push('נפתח במקור אצל ' + MOBILE[p2] + '. אנשים מעבירים מספר בין חברות, אז ייתכן שהיום הוא בחברה אחרת.');
        if (p2 === '55') r.facts.push('קידומת 055 משמשת גם מפעילים זולים, וחלק ממוקדי המכירות בוחרים בה.');
      } else { r.kind = 'מספר שמתחיל ב-05'; warn('הקידומת 0' + p2 + ' לא מוכרת כקידומת סלולרית רגילה. ייתכן שהמספר מזויף.'); }
      r.mobile = true;
    } else if (/^0[2-489]\d{7}$/.test(digits)) {
      r.kind = 'טלפון קווי – ' + AREA[digits[1]];
      r.facts.push('קו בבית או בעסק באזור ' + AREA[digits[1]] + '. שיחה ממספר קווי לא מוכר היא לרוב עסק, מוסד או מוקד.');
    } else if (/^07[2-9]\d{7}$/.test(digits)) {
      r.kind = 'מספר אינטרנטי (קידומת ' + digits.slice(0, 3) + ')';
      r.facts.push('מספר שעובד דרך האינטרנט, ולא קשור לאזור. משתמשים בו עסקים, בתים, וגם הרבה מוקדי מכירות וספאם.');
      warn('רוב שיחות הספאם והמכירות בארץ מגיעות ממספרים כאלה. לא חייב להיות ספאם, אבל כדאי לבדוק לפני שמחזירים.');
    } else if (/^1(800|80\d)\d{6}$/.test(digits)) {
      r.kind = 'מספר חינם (1-800)'; r.local = digits; r.display = fmtIL(digits);
      r.facts.push('מספר שירות של עסק. השיחה אליו בחינם.');
    } else if (/^1700\d{6}$/.test(digits)) {
      r.kind = 'מספר שירות (1-700)'; r.display = fmtIL(digits);
      r.facts.push('מספר של עסק או מוסד. שיחה אליו עולה כמו שיחה רגילה.');
    } else if (/^1599\d{6}$/.test(digits)) {
      r.kind = 'מספר עסקי (1-599)'; r.display = fmtIL(digits);
      r.facts.push('מספר של עסק. השיחה אליו בתשלום.');
    } else if (/^19(00|01|19)\d{6}$/.test(digits)) {
      r.kind = 'מספר בתשלום מיוחד (' + digits.slice(0, 4) + ')'; r.display = fmtIL(digits);
      bad('שיחה למספר כזה עולה הרבה יותר משיחה רגילה. לא מחזירים שיחה למספר כזה שלא מכירים.');
    } else {
      r.kind = 'מספר במבנה לא רגיל'; r.display = s;
      warn('למספר הזה יש ' + digits.length + ' ספרות, ולא כמו מספר ישראלי רגיל (נייד: 10 ספרות, קווי: 9). אולי חסרה ספרה, או שהמספר מוסתר או מזויף.');
      r.intl = '';
    }
    return finish(r);
  }

  function warnOn(r, t) { r.facts.push('⚠️ ' + t); if (r.level === 'ok') r.level = 'warn'; }
  function badOn(r, t) { r.facts.push('🚫 ' + t); r.level = 'bad'; }

  function intl(r, d) {
    function warn(t) { warnOn(r, t); }
    function bad(t) { badOn(r, t); }
    var code = '';
    for (var len = 3; len >= 1; len--) { if (CC[d.slice(0, len)]) { code = d.slice(0, len); break; } }
    r.israeli = false; r.intl = d; r.display = '+' + d; r.local = '+' + d;
    if (!code) { r.kind = 'מספר מחו"ל'; r.country = 'לא מזוהה'; warn('קידומת המדינה לא מזוהה. ייתכן שהמספר מזויף.'); return finish(r); }
    r.country = CC[code]; r.cc = code;
    r.display = '+' + code + ' ' + d.slice(code.length);
    r.kind = 'מספר מחו"ל – ' + CC[code];
    if (code === '1' && CARIB[d.slice(1, 4)]) {
      r.country = CARIB[d.slice(1, 4)];
      r.kind = 'מספר מחו"ל – ' + r.country;
      bad('נראה כמו מספר אמריקאי, אבל הקידומת ' + d.slice(1, 4) + ' שייכת ל' + r.country + '. זו שיטת עוקץ ידועה: מחזירים שיחה ומשלמים הרבה.');
    } else if (WANGIRI.indexOf(code) > -1) {
      bad(CC[code] + ' מופיעה הרבה בשיחות עוקץ של "צלצול אחד": מתקשרים ומנתקים כדי שתחזירו שיחה יקרה. אם אתם לא מכירים אף אחד שם – לא מחזירים.');
    } else {
      warn('שיחה מחו"ל ממספר לא מוכר: אם ניתקו אחרי צלצול אחד, לא מחזירים. אם אתם מכירים מישהו ב' + CC[code] + ', כנראה שזה הוא.');
    }
    return finish(r);
  }

  function finish(r) {
    r.levelText = r.level === 'bad' ? 'חשד גבוה לעוקץ או לספאם' : r.level === 'warn' ? 'כדאי להיזהר' : 'לא נמצאו סימני אזהרה';
    r.links = links(r);
    return r;
  }

  function links(r) {
    var L = [], q;
    if (r.intl && r.intl.length >= 9) {
      L.push({ id: 'wa', t: 'לפתוח בווטסאפ', d: 'רואים תמונה ושם שבעל המספר בחר, ובעסק – את שם העסק. לא נשלחת הודעה.', u: 'https://wa.me/' + r.intl });
      L.push({ id: 'tg', t: 'לפתוח בטלגרם', d: 'אם בעל המספר מאפשר למצוא אותו לפי מספר, יופיעו השם והתמונה.', u: 'https://t.me/+' + r.intl });
    }
    // לא מצאתם בווטסאפ? אפליקציות זיהוי מתקשר. כל אחד מתחבר עם החשבון שלו ומשתמש בחיפושים החינמיים היומיים שלו.
    if (r.israeli && /^0\d{8,9}$/.test(r.local)) {
      L.push({ id: 'tc', t: 'לחפש ב-Truecaller', d: 'מראה את השם שאנשים אחרים שמרו למספר. צריך להתחבר עם גוגל, ויש כמה חיפושים חינם ביום.', u: 'https://www.truecaller.com/search/il/' + r.local });
    }
    if (r.intl && r.intl.length >= 9) {
      L.push({ id: 'sm', t: 'לחפש ב-Sync.ME', d: 'עוד מאגר של שמות וסימוני ספאם. גם כאן יש מגבלה יומית קטנה.', u: 'https://sync.me/search/?number=' + r.intl });
    }
    if (r.israeli && /^05\d{8}$/.test(r.local)) {
      L.push({ id: 'me', t: 'לבדוק באפליקציית Me', d: 'אפליקציה ישראלית לזיהוי מתקשר. מתקינים פעם אחת, ומדביקים בה את המספר.', u: 'https://meapp.co.il/' });
    }
    var forms = [];
    if (r.israeli && /^0\d+$/.test(r.local)) forms = ['"' + r.local + '"', '"' + fmtIL(r.local) + '"', '"+' + r.intl + '"'];
    else if (r.israeli && /^1\d{9}$/.test(r.local)) forms = ['"' + r.local + '"', '"' + fmtIL(r.local) + '"'];
    else if (r.local) forms = ['"' + r.local + '"'];
    if (r.intl && !r.israeli) forms.push('"' + r.intl + '"');
    if (forms.length) {
      q = forms.join(' OR ');
      L.push({ id: 'g', t: 'לחפש בגוגל של מי המספר', d: 'אם זה עסק, או שמישהו כבר כתב על המספר – זה יופיע.', u: 'https://www.google.com/search?q=' + encodeURIComponent(q) });
      L.push({ id: 'gs', t: 'לחפש דיווחים על ספאם', d: 'האם אנשים אחרים כתבו שהמספר הזה מטריד או מנסה לעקוץ.', u: 'https://www.google.com/search?q=' + encodeURIComponent('(' + q + ') ספאם OR הטרדה OR עוקץ OR spam OR scam') });
    }
    if (r.israeli && /^0[2-489]\d{7}$|^07\d{8}$|^1\d{9}$/.test(r.local)) {
      L.push({ id: 'b144', t: 'לחפש במדריך 144 ובדפי זהב', d: 'מספרים קוויים ועסקיים רשומים שם עם שם וכתובת.', u: 'https://www.google.com/search?q=' + encodeURIComponent('(site:b144.co.il OR site:d.co.il) ("' + r.local + '" OR "' + fmtIL(r.local) + '")') });
    }
    return L;
  }

  var MI = { check: check, fmtIL: fmtIL, T: { MOBILE: MOBILE, PAL: PAL, AREA: AREA, SHORT: SHORT, CC: CC, WANGIRI: WANGIRI, CARIB: CARIB } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = MI; return; }
  root.MI = MI;

  // ---------- הדף ----------
  var $ = function (id) { return document.getElementById(id); };
  var go = $('mi-go');
  if (go) go.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = ($('mi-go-n').value || '').trim();
    if (window.toolUsed) window.toolUsed('mi', { how: 'go' });
    location.href = '/kelim/machshev/mi-mitkasher/' + (v ? '#' + encodeURIComponent(v) : '');
  });
  var inp = $('mi-n');
  if (!inp) return;
  var KEY = 'kelim-machshev-mi';
  var DEMO = '+225 07 00 00 00 00';
  var cur = null, used = 0;
  var store = { marks: {}, last: '' };
  try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.marks) store = j; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function keyOf(r) { return r ? (r.intl || r.local || '') : ''; }
  function track(how) { var now = Date.now(); if (how === 'check' && now - used < 30000) return; if (how === 'check') used = now; if (window.toolUsed) window.toolUsed('mi', { how: how }); }

  function render() {
    var v = inp.value;
    cur = check(v);
    var box = $('mi-res');
    if (!cur) { box.innerHTML = ''; $('mi-lookbox').hidden = true; return; }
    var m = store.marks[keyOf(cur)];
    var demo = v.trim() === DEMO;
    box.innerHTML =
      (demo ? '<p class="note">זו דוגמה. מדביקים במקומה את המספר שהתקשר אליכם.</p>' : '') +
      '<div class="mi-num">' + esc(cur.display) + '</div>' +
      '<div class="mi-what">' + esc(cur.kind) + '</div>' +
      '<span class="mi-lvl ' + cur.level + '">' + esc(cur.levelText) + '</span>' +
      '<ul class="mi-facts">' + cur.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<div class="mi-mine">' + (m ? (m.t === 's' ? '🚫 סימנתם את המספר הזה כספאם' : '✓ סימנתם את המספר הזה כמוכר') + (m.n ? ': ' + esc(m.n) : '') : '') + '</div>';
    $('mi-look').innerHTML = cur.links.map(function (l) {
      return '<a href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer" data-l="' + l.id + '"><b>' + esc(l.t) + ' ←</b><span>' + esc(l.d) + '</span></a>';
    }).join('');
    $('mi-lookbox').hidden = !cur.links.length && !keyOf(cur);
    $('mi-note').value = m && m.n ? m.n : '';
    warnLink();
    if (!demo) { store.last = v; save(); track('check'); }
  }

  function warnLink() {
    if (!cur) return;
    var m = store.marks[keyOf(cur)];
    var txt = 'שימו לב: התקשרו אליי מהמספר ' + cur.display + (m && m.n ? ' (' + m.n + ')' : '') + (m && m.t === 'k' ? '.' : ' – נראה כמו ספאם. לא לענות ולא להחזיר שיחה.') +
      '\nבדקתי בכלי "מי התקשר", בחינם: ' + location.origin + '/kelim/machshev/mi-mitkasher/';
    $('mi-warn').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
  }

  function mark(t) {
    if (!cur || !keyOf(cur)) return;
    store.marks[keyOf(cur)] = { t: t, n: $('mi-note').value.trim().slice(0, 60), d: cur.display, at: Date.now() };
    save(); render(); list(); track(t === 's' ? 'spam' : 'known');
  }

  function list() {
    var ks = Object.keys(store.marks).sort(function (a, b) { return store.marks[b].at - store.marks[a].at; });
    $('mi-mybox').hidden = !ks.length;
    $('mi-list').innerHTML = ks.map(function (k) {
      var m = store.marks[k];
      return '<li><span class="mi-tag ' + m.t + '">' + (m.t === 's' ? 'ספאם' : 'מוכר') + '</span><b>' + esc(m.d) + '</b><span>' + esc(m.n || '') + '</span>' +
        '<button type="button" data-open="' + esc(m.d) + '" aria-label="לבדוק שוב">↺</button><button type="button" data-del="' + esc(k) + '" aria-label="למחוק את הסימון">✕</button></li>';
    }).join('');
  }

  inp.addEventListener('input', render);
  $('mi-paste').addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { inp.value = t.trim(); render(); }, function () { inp.focus(); });
    } else inp.focus();
  });
  $('mi-spam').addEventListener('click', function () { mark('s'); });
  $('mi-known').addEventListener('click', function () { mark('k'); });
  $('mi-look').addEventListener('click', function (e) { var a = e.target.closest('a[data-l]'); if (a) track(a.getAttribute('data-l')); });
  $('mi-warn').addEventListener('click', function () { track('wa'); });
  $('mi-list').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-del')) { delete store.marks[b.getAttribute('data-del')]; save(); list(); render(); }
    else { inp.value = b.getAttribute('data-open'); render(); window.scrollTo({ top: inp.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); }
  });

  // מספר בכתובת (#050...) – לקיצור דרך מהבוט או מסימנייה; אחרת המספר האחרון, ואחרת דוגמה
  var h = decodeURIComponent((location.hash || '').slice(1));
  inp.value = /^[+\d*][\d\s()+*-]{2,}$/.test(h) ? h : (store.last || DEMO);
  render(); list();
})(typeof window !== 'undefined' ? window : this);
