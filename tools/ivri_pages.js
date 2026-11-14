// יוצר שני דפים ציבוריים בכלי קודש:
//   src/pages/kodesh/luach-ivri/index.html   – "לוח שנה עברי לועזי" (לוח חודשי, חגי ישראל השנה והשנה הבאה, הדפסה)
//   src/pages/kodesh/taarich-ivri/index.html – "תאריך עברי היום והמרת תאריך לועזי לעברי" (+ מחשבון בר/בת מצווה)
// הלוח, הטבלאות והתוצאות שבתוך הדף (לגוגל ולמי שאין לו JavaScript) מחושבים כאן מאותו קוד שרץ בדפדפן:
// assets/kodesh-ivri.js + hebcal 6.14.7. בדפדפן הדף מחשב מחדש בכל כניסה, אז הוא תמיד מעודכן.
// רץ לבד כל יום ראשון בלילה: .github/workflows/ivri.yml (שומר רק את ארבעת הקבצים של שני הדפים).
// הרצה ידנית:  node tools/ivri_pages.js   ואז  python build.py
// מילות החיפוש: ~/.claude/state/kelim-seo/ (לוח שנה עברי, תאריך עברי, המרת תאריך לועזי לעברי, מחשבון בר מצווה).
'use strict';
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js'), 'utf8') + ';hebcal');
const I = require(path.join(ROOT, 'assets/kodesh-ivri.js'));
const C = I.core(H);
const NOW = process.env.IVRI_NOW ? new Date(process.env.IVRI_NOW) : new Date();
const T = C.today(new Date(C.clean(NOW).getTime() - 5 * 3600e3), C.place('yerushalaim'));   // 07:00 – תמיד לפני השקיעה
const CIV = T.civ, HY = T.hdDay.getFullYear(), Y0 = C.yearInfo(HY), Y1 = C.yearInfo(HY + 1);
const yrs = i => i.start.getFullYear() + '–' + i.end.getFullYear();
const GY = CIV.getFullYear(), NEXTG = GY + 1;

function faqLd(qa) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
}
function faqHtml(qa) {
  return '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';
}
function write(dir, meta, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
}
const HEAD = '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css">';
const FOOT = '<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script><script src="/assets/kodesh-ivri.js" defer></script>';
const WA = '<svg class="ic"><use href="#wa"/></svg>';
const strip = s => s.replace(/<[^>]+>/g, '');

// ======================= לוח שנה עברי לועזי =======================
(function () {
  const mo = C.month('g', CIV.getFullYear(), CIV.getMonth()), map = C.evMap(mo.days[0], mo.days[mo.days.length - 1]);
  const qa = [
    ['מה התאריך העברי היום?', 'בראש הלוח כתוב התאריך העברי של היום, והיום עצמו מסומן במסגרת זהב. התאריך העברי מתחלף בשקיעה, ולכן בערב כתוב גם התאריך העברי שכבר התחיל. להמרה של כל תאריך יש את הדף <a href="' + I.TAARICH + '">תאריך עברי והמרת תאריכים</a>.'],
    ['מתי החגים השנה?', 'מתחת ללוח יש טבלה של חגי ישראל בשנת ' + Y0.name + ' ובשנת ' + Y1.name + ', עם התאריך העברי, התאריך הלועזי והיום בשבוע. חג שהוא יום שבתון (בלי עבודה) מסומן במילה "שבתון".'],
    ['איך מדפיסים לוח שנה?', 'לוחצים "להדפיס את החודש" ומקבלים דף אחד של החודש שעל המסך, או "להדפיס את כל השנה" ומקבלים את כל החודשים, שני חודשים בכל עמוד. אפשר גם לבחור "שמירה כ-PDF" בחלון ההדפסה.'],
    ['אפשר לראות לוח לפי חודש עברי?', 'כן. בוחרים "לפי חודש עברי", והלוח מראה חודש עברי שלם, מא׳ ועד כ״ט או ל׳, עם התאריך הלועזי של כל יום. בשנה מעוברת יש גם אדר א׳ ואדר ב׳.'],
    ['למה ראש חודש הוא לפעמים יומיים?', 'כשלחודש הקודם יש 30 ימים, היום ה-30 שלו הוא היום הראשון של ראש חודש, וא׳ בחודש החדש הוא היום השני. כשלחודש הקודם יש 29 ימים, ראש חודש הוא יום אחד.'],
    ['הלוח לפי ארץ ישראל או חוץ לארץ?', 'לפי ארץ ישראל: יום טוב אחד בכל חג, ופרשות השבוע כמו שקוראים בארץ. זמני כניסת שבת וצאת שבת לפי עיר יש בדף <a href="/kodesh/shabat/">כניסת שבת וצאת שבת</a>.']
  ];
  const meta = {
    site: 'kodesh', tool: 'luach_ivri', no_hub: true,
    title: 'לוח שנה עברי לועזי ' + Y0.name + ' ו-' + NEXTG + ': חגים, ראשי חודשים ופרשות | כלי קודש',
    description: 'לוח שנה עברי לועזי: התאריך העברי היום, כל יום בעברי ובלועזי, חגי ישראל, צומות, ראשי חודשים ופרשת השבוע. לוח ' + GY + ' ו-' + NEXTG + ', חגים ' + yrs(Y0) + ', לוח שנה להדפסה. בחינם, בלי פרסומות.',
    og_title: 'לוח שנה עברי לועזי – חגים, ראשי חודשים ופרשות',
    priority: '0.8',
    crumbs: [['לוח שנה עברי לועזי', null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const body = `<header class="k-hero no-print">
  <h1>לוח שנה עברי לועזי</h1>
  <p class="sub">כל יום בעברי ובלועזי, עם חגים, צומות, ראשי חודשים ופרשת השבוע. עוברים בין חודשים, קופצים לשנה, ומדפיסים.</p>
</header>
<p class="iv-today no-print"><span id="li-today"><b>היום:</b> ${C.todayLine(T)}</span><span class="iv-nh" id="li-nexthag">${strip(C.nextHolidayText(CIV))}</span></p>
<div class="tool iv-print" id="li">
  <div class="iv-bar">
    <button class="iv-nav" type="button" id="li-prev" aria-label="החודש הקודם">→</button>
    <h2><span id="li-title">${mo.title}</span><small id="li-sub">${mo.sub}</small></h2>
    <button class="iv-nav" type="button" id="li-next" aria-label="החודש הבא">←</button>
  </div>
  <form class="k-form iv-ctl no-print" id="li-form" novalidate onsubmit="return false">
    <div class="radios" role="radiogroup" aria-label="סוג הלוח"><label><input type="radio" name="li-mode" value="g" checked> לפי חודש לועזי</label><label><input type="radio" name="li-mode" value="h"> לפי חודש עברי</label></div>
    <div class="field"><label for="li-month">חודש</label><select id="li-month">${I.GM.map((n, i) => `<option value="${i}"${i === CIV.getMonth() ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="li-year" id="li-year-l">שנה</label><input id="li-year" type="number" inputmode="numeric" min="${I.GY_MIN}" max="${I.GY_MAX}" value="${CIV.getFullYear()}"></div>
    <button class="btn btn-line btn-sm" type="button" id="li-now">היום</button>
    <p class="iv-msg" id="li-msg" role="status"></p>
  </form>
  <div id="li-grid">${C.gridHtml(mo, C.key(CIV), map)}</div>
  <ul class="iv-leg no-print" aria-label="מקרא">
    <li><span style="background:var(--gold)"></span>חג</li><li><span style="background:rgba(212,176,98,.35)"></span>מועד</li><li><span style="background:rgba(160,130,210,.5)"></span>צום</li><li><span style="background:rgba(110,180,130,.45)"></span>ראש חודש</li><li><span style="background:rgba(127,167,224,.45)"></span>יום לאומי</li>
  </ul>
  <p class="disclaimer no-print">לוחצים על יום ורואים את התאריך העברי המלא, החג והפרשה.</p>
  <div class="res iv-day no-print" id="li-day" aria-live="polite" hidden></div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" data-iv-print="m">להדפיס את החודש</button>
    <button class="btn btn-line btn-sm" type="button" data-iv-print="y">להדפיס את כל שנת <bdi data-iv-yr>${CIV.getFullYear()}</bdi></button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="לוח שנה עברי לועזי, עם חגים, ראשי חודשים ופרשות. בחינם ובלי פרסומות:" target="_blank" rel="noopener">${WA} לשלוח לחבר</a>
  </div>
</div>
<div id="li-printbox" aria-hidden="true"></div>

<section class="k-sec iv-list-wrap" aria-labelledby="li-list-h">
  <h2 id="li-list-h">חגים ומועדים: ${mo.title}</h2>
  <div id="li-list">${C.listHtml(mo, map)}</div>
</section>

<section class="k-sec" aria-labelledby="li-hag0-h" id="chagim">
  <h2 id="li-hag0-h">חגי ישראל ${Y0.name}: חגים ${yrs(Y0)} וימי שבתון</h2>
  <p class="lead2">שנת ${Y0.name} מתחילה ב-<bdi>${C.dmy(Y0.start)}</bdi> ונגמרת ב-<bdi>${C.dmy(Y0.end)}</bdi>. ${Y0.leap ? 'זו שנה מעוברת: ' + Y0.days + ' ימים ו-13 חודשים, עם אדר א׳ ואדר ב׳.' : 'זו שנה רגילה: ' + Y0.days + ' ימים ו-12 חודשים.'} "שבתון" = יום טוב, בלי עבודה ובלי לימודים.</p>
  <div id="li-hag0">${C.holidaysHtml(HY, CIV)}</div>
</section>

<section class="k-sec" aria-labelledby="li-hag1-h">
  <h2 id="li-hag1-h">חגי ישראל ${Y1.name}: חגים ${yrs(Y1)}</h2>
  <p class="lead2">שנת ${Y1.name} מתחילה ב-<bdi>${C.dmy(Y1.start)}</bdi>. ${Y1.leap ? 'זו שנה מעוברת, עם אדר א׳ ואדר ב׳.' : 'זו שנה רגילה, עם אדר אחד.'} רוצים לתכנן חופשה או שמחה? כאן רואים מראש איפה נופל כל חג.</p>
  <div id="li-hag1">${C.holidaysHtml(HY + 1, null)}</div>
  <div class="share-row"><a class="btn btn-line btn-sm" href="${I.TAARICH}">להמיר תאריך לועזי לעברי ←</a><a class="btn btn-line btn-sm" href="/kodesh/shabat/">כניסת שבת וצאת שבת ←</a></div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">לוח שנה עברי לועזי: כל התאריכים במקום אחד</h2>
  <p>הלוח מראה כל יום פעמיים: התאריך הלועזי בגדול, והתאריך העברי מתחתיו. ליד כל יום כתוב אם הוא חג, צום, ראש חודש, יום זיכרון או יום עצמאות, ובשבת כתובה פרשת השבוע. עוברים לחודש הבא או הקודם בחץ, בוחרים חודש ושנה, או חוזרים להיום בלחיצה. אפשר להחליף ל"לוח לפי חודש עברי" ולראות חודש עברי שלם, מא׳ בחודש ועד סופו, עם התאריך הלועזי של כל יום. הכול נטען מיד, בלי פרסומות ובלי הרשמה, וגם בטלפון.</p>
  <h3>לוח שנה ${GY} ולוח שנה ${NEXTG}</h3>
  <p>הלוח עובד לכל שנה, מ-${I.GY_MIN} ועד ${I.GY_MAX}. כותבים שנה, למשל ${NEXTG}, ורואים כל חודש בה. רוצים לבדוק מתי היה תאריך עברי של יום הולדת, של יום נישואים או של אירוע משפחתי? בוחרים את החודש, ולוחצים על היום. בדף <a href="${I.TAARICH}">תאריך עברי והמרת תאריכים</a> אפשר גם להמיר תאריך בודד בשני הכיוונים, לראות מה התאריך העברי היום, ולחשב מתי בר המצווה.</p>
  <h3>חגי ישראל וחגים ${NEXTG}</h3>
  <p>מתחת ללוח יש שתי טבלאות: חגי ישראל של השנה העברית הזו ושל השנה הבאה. בכל שורה כתוב החג, התאריך העברי, התאריך הלועזי והיום בשבוע, וגם מתי הערב שבו החג נכנס, למשל ליל הסדר או ערב יום הכיפורים. כך רואים מראש מתי ראש השנה, סוכות, חנוכה, פורים, פסח, יום העצמאות ושבועות, בשנת ${Y0.name} ובשנת ${Y1.name}.</p>
  <h3>לוח חופשות וימי שבתון</h3>
  <p>ימי החג שהם יום טוב מסומנים "שבתון": בהם לא עובדים, ובתי הספר והמשרדים סגורים. ימי חול המועד, חנוכה ופורים מופיעים בלוח בצבע אחר. תאריכי החופשות המדויקים של בתי הספר נקבעים כל שנה על ידי משרד החינוך, ולכן כדאי לבדוק אותם גם שם. הלוח כאן עוזר לראות במבט אחד איפה נופלים החגים, כדי לתכנן חופשה, טיול או שמחה.</p>
  <h3>לוח שנה להדפסה</h3>
  <p>לוחצים "להדפיס את החודש", ומקבלים לוח חודשי נקי לתלייה על המקרר או בכיתה, בשחור על לבן כדי לחסוך בדיו. "להדפיס את כל השנה" מדפיס את כל החודשים של השנה שעל המסך, שני חודשים בעמוד. בחלון ההדפסה אפשר לבחור גם "שמירה כ-PDF" ולשלוח בווטסאפ.</p>
  <h3>לרבנים ולבית הכנסת</h3>
  <p>צריכים לוח עם זמני הדלקת נרות וצאת שבת לפי עיר, עם כותרת של הקהילה וקובץ ליומן? יש <a href="/kodesh/luach-shana/">לוח השנה לרב ולבית הכנסת</a>. לברית, פדיון הבן, שלושים ויארצייט יש <a href="/kodesh/taarichim/">מחשבון תאריכים לרב</a>. ולזמני השבת השבוע: <a href="/kodesh/shabat/">כניסת שבת וצאת שבת לפי עיר</a>.</p>
  <h3>למה זה בחינם</h3>
  <p>הלוח הוא חלק ממיזם הכלים של גילעד רחמים: כלים פשוטים, בחינם, בלי הרשמה ובלי פרסומות. החישוב נעשה בטלפון שלכם, לפי מנהג ארץ ישראל, בספרייה פתוחה שמשמשת לוחות שנה רבים בעולם.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(ROOT, 'src/pages/kodesh/luach-ivri'), meta, body);
})();

// ======================= תאריך עברי היום + המרה =======================
(function () {
  const hd = T.hdDay, ex = C.noon(GY - 12, CIV.getMonth(), CIV.getDate());
  const qa = [
    ['מה התאריך העברי היום?', 'התאריך העברי של היום כתוב בגדול בראש הדף, ומתעדכן לבד. בערב, אחרי השקיעה, הדף מראה כבר את התאריך העברי של מחר, כי היום העברי מתחיל בשקיעה.'],
    ['למה התאריך העברי מתחלף בערב?', 'בלוח העברי היום מתחיל בשקיעה ולא בחצות, כמו שכתוב בתורה "ויהי ערב ויהי בוקר". לכן מי שנולד אחרי השקיעה, התאריך העברי שלו הוא של היום שאחרי. הדף מחשב את שעת השקיעה לפי העיר שבחרתם.'],
    ['איך ממירים תאריך לועזי לעברי?', 'בוחרים תאריך בחלק "המרת תאריך לועזי לעברי", ואם זה היה אחרי השקיעה מסמנים "אחרי השקיעה". התאריך העברי מופיע מיד, עם היום בשבוע ועם החג או הפרשה של אותו יום.'],
    ['מתי בר המצווה לפי התאריך העברי?', 'בר מצווה הוא ביום ההולדת העברי ה-13, ובת מצווה ביום ההולדת העברי ה-12. מכניסים את תאריך הלידה ואם זה היה אחרי השקיעה, ומקבלים את התאריך העברי והלועזי, ואת השבת שאחריו.'],
    ['מה קורה למי שנולד באדר?', 'מי שנולד באדר של שנה רגילה, ובשנת בר המצווה יש אדר א׳ ואדר ב׳, חוגג באדר ב׳. מי שנולד באדר א׳ או באדר ב׳, ובשנת בר המצווה יש רק אדר אחד, חוגג באדר. המחשבון עושה את זה לבד, ובמקרים מיוחדים כותב הערה.'],
    ['מה התאריך העברי של יום ההולדת שלי השנה?', 'מכניסים את תאריך הלידה בחלק של בר המצווה, ומתחת מופיעים ימי ההולדת העבריים בשנים הקרובות, כל אחד עם התאריך הלועזי שלו. כך יודעים מתי לחגוג לפי הלוח העברי.']
  ];
  const meta = {
    site: 'kodesh', tool: 'taarich_ivri', no_hub: true,
    title: 'תאריך עברי היום והמרת תאריך לועזי לעברי, מחשבון בר מצווה | כלי קודש',
    description: 'תאריך עברי היום, לפי השקיעה בעיר שלכם. המרת תאריך לועזי לעברי ומעברי ללועזי, כולל אדר א׳ ואדר ב׳ והיום בשבוע. מחשבון בר מצווה ובת מצווה ויום הולדת עברי. בחינם, בלי פרסומות.',
    og_title: 'תאריך עברי היום והמרת תאריכים',
    priority: '0.8',
    crumbs: [['תאריך עברי והמרת תאריכים', null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const cityOpts = I.CITIES.map(c => `<option value="${c[0]}"${c[0] === 'yerushalaim' ? ' selected' : ''}>${c[1]}</option>`).join('') + '<option value="gps">לפי המיקום שלי</option>';
  const dayOpts = Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}"${i + 1 === hd.getDate() ? ' selected' : ''}>${C.gem(i + 1)}</option>`).join('');
  const monOpts = C.hmonths(HY).map(k => `<option value="${k}"${k === hd.getMonth() ? ' selected' : ''}>${C.mon(k, HY)}</option>`).join('');
  const body = `<header class="k-hero">
  <h1>תאריך עברי היום והמרת תאריכים</h1>
  <p class="sub">מה התאריך העברי היום, המרה מלועזי לעברי ומעברי ללועזי, ומחשבון בר מצווה ובת מצווה.</p>
</header>
<div class="tool" id="ti">
  <nav class="iv-tabs" aria-label="בדף הזה"><a href="#ti-g2h-h">לועזי ← עברי</a><a href="#ti-h2g-h">עברי ← לועזי</a><a href="#ti-bm-h">בר מצווה</a><a href="${I.LUACH}">לוח שנה</a></nav>
  <div class="res iv-hero" id="ti-today" aria-live="polite">${C.todayHtml(T, true)}</div>
  <form class="k-form" novalidate onsubmit="return false" style="margin-top:.8rem">
    <div class="field"><label for="ti-place">השקיעה לפי <span class="opt">(אז מתחלף התאריך העברי)</span></label><select id="ti-place">${cityOpts}</select></div>
    <p class="iv-sub" id="ti-st" role="status"></p>
  </form>
  <div class="share-row">
    <a class="btn btn-gold btn-sm" href="#" id="ti-wa" target="_blank" rel="noopener">${WA} לשלוח את התאריך העברי</a>
    <button class="btn btn-line btn-sm" type="button" id="ti-copy">להעתיק</button>
  </div>
  <p class="disclaimer">היום העברי מתחיל בשקיעה. השקיעה מחושבת לפי העיר שבחרתם, בגובה פני הים. סמוך לשקיעה (בין השמשות), בשאלה למעשה שואלים רב.</p>
</div>

<section class="k-sec" aria-labelledby="ti-g2h-h">
  <h2 id="ti-g2h-h">המרת תאריך לועזי לעברי</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="field"><label for="ti-gdate">תאריך לועזי</label><input id="ti-gdate" type="date" min="${I.GY_MIN}-01-01" max="${I.GY_MAX}-12-31" value="${C.key(CIV)}"></div>
    <label class="check"><input type="checkbox" id="ti-gafter"> <span>אחרי השקיעה (בערב או בלילה)</span></label>
  </form>
  <div class="res" id="ti-g2h-res" aria-live="polite">${C.g2hHtml(CIV, false)}</div>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" id="ti-g2h-wa" target="_blank" rel="noopener">${WA} לשלוח</a><button class="btn btn-line btn-sm" type="button" id="ti-g2h-copy">להעתיק</button></div>
</section>

<section class="k-sec" aria-labelledby="ti-h2g-h">
  <h2 id="ti-h2g-h">המרת תאריך עברי ללועזי</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="iv-row">
      <div class="field"><label for="ti-hday">יום</label><select id="ti-hday">${dayOpts}</select></div>
      <div class="field"><label for="ti-hmon">חודש</label><select id="ti-hmon">${monOpts}</select></div>
      <div class="field"><label for="ti-hyear">שנה</label><input id="ti-hyear" type="text" inputmode="text" autocomplete="off" value="${HY}" aria-describedby="ti-hyear-eq"></div>
    </div>
    <p class="iv-yeq" id="ti-hyear-eq">= ${Y0.name} (${HY})${Y0.leap ? ', שנה מעוברת' : ''}</p>
  </form>
  <div class="res" id="ti-h2g-res" aria-live="polite">${C.h2gHtml(HY, hd.getMonth(), hd.getDate())}</div>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" id="ti-h2g-wa" target="_blank" rel="noopener">${WA} לשלוח</a><button class="btn btn-line btn-sm" type="button" id="ti-h2g-copy">להעתיק</button></div>
  <p class="disclaimer">את השנה כותבים במספר (${HY}) או באותיות (${Y0.name}). בשנה מעוברת יש אדר א׳ ואדר ב׳; בשנה רגילה יש אדר אחד.</p>
</section>

<section class="k-sec" aria-labelledby="ti-bm-h">
  <h2 id="ti-bm-h">מחשבון בר מצווה ובת מצווה ויום הולדת עברי</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="field"><span class="label">מי נולד?</span><div class="radios"><label><input type="radio" name="ti-sex" value="boy" checked> בן (בר מצווה, 13)</label><label><input type="radio" name="ti-sex" value="girl"> בת (בת מצווה, 12)</label></div></div>
    <div class="field"><label for="ti-bdate">תאריך הלידה (לועזי)</label><input id="ti-bdate" type="date" min="${I.GY_MIN}-01-01" max="${I.GY_MAX - 14}-12-31"></div>
    <label class="check"><input type="checkbox" id="ti-bafter"> <span>הלידה הייתה אחרי השקיעה</span></label>
  </form>
  <div id="ti-bm-res" aria-live="polite">${C.bmHtml(ex, false, false, CIV, true)}</div>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" id="ti-bm-wa" target="_blank" rel="noopener">${WA} לשלוח</a><button class="btn btn-line btn-sm" type="button" id="ti-bm-copy">להעתיק</button><a class="btn btn-line btn-sm" id="ti-bm-inv" href="/kelim/eruim/hazmana/bar-mitzva/">להכין הזמנה לבר המצווה</a></div>
  <p class="disclaimer">תאריך הלידה נשמר רק בטלפון שלכם, ולא נשלח לשום מקום. במקרים מיוחדים (לידה בבין השמשות, ל׳ באדר א׳) שואלים רב.</p>
</section>

<section class="k-sec" aria-labelledby="ti-next-h">
  <h2 id="ti-next-h">התאריך העברי בימים הקרובים</h2>
  <div id="ti-next">${C.nextDaysHtml(CIV, 14, true)}</div>
  <div class="share-row"><a class="btn btn-line btn-sm" href="${I.LUACH}">ללוח השנה העברי לועזי המלא ←</a></div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">תאריך עברי: מה התאריך היום ואיך ממירים</h2>
  <p>בראש הדף כתוב התאריך העברי של היום, באותיות, עם היום בשבוע והתאריך הלועזי. מתחת יש שני ממירים: מתאריך לועזי לתאריך עברי, ומתאריך עברי לתאריך לועזי. התוצאה מופיעה מיד, בלי ללחוץ על כפתור, ואפשר לשלוח אותה בווטסאפ או להעתיק. הדף עובד מהר גם בטלפון, בלי פרסומות ובלי הרשמה, ושום פרט לא נשלח לשרת.</p>
  <h3>התאריך העברי מתחלף בשקיעה</h3>
  <p>בלוח העברי היום מתחיל בערב, עם השקיעה, ולא בחצות. לכן ביום רביעי בערב, אחרי השקיעה, כבר מתחיל התאריך העברי של יום חמישי. הדף בודק מה השעה ומתי השמש שוקעת בעיר שבחרתם (או לפי המיקום שלכם), ומראה את התאריך הנכון לרגע הזה. בממיר מסמנים "אחרי השקיעה" כשמחפשים תאריך עברי של לידה או של אירוע שהיה בערב. סמוך מאוד לשקיעה, בזמן שנקרא בין השמשות, יש ספק, ובשאלה למעשה שואלים רב.</p>
  <h3>המרת תאריך עברי ללועזי</h3>
  <p>בוחרים יום, חודש ושנה עבריים, והדף מראה את התאריך הלועזי ואת היום בשבוע. את השנה אפשר לכתוב במספר, כמו ${HY}, או באותיות, כמו ${Y0.name}. בשנה מעוברת יש שני חודשי אדר, אדר א׳ ואדר ב׳, והרשימה משתנה לבד לפי השנה. אם בוחרים תאריך שאין בשנה הזו, כמו ל׳ בחשוון בשנה שבה לחשוון יש 29 ימים, הדף אומר את זה ולא ממציא תאריך.</p>
  <h3>מחשבון בר מצווה ובת מצווה</h3>
  <p>בר מצווה חל ביום ההולדת העברי ה-13, ובת מצווה ביום ההולדת העברי ה-12. מכניסים תאריך לידה לועזי, מסמנים אם הלידה הייתה אחרי השקיעה, ומקבלים את תאריך הלידה העברי, את יום בר המצווה בעברי ובלועזי, ואת השבת שאחריו עם הפרשה, שבה בדרך כלל עולים לתורה. המחשבון יודע מה קורה בשנה מעוברת ובחודש שחסר בו יום ל׳. מתחת מופיעים ימי ההולדת העבריים בשנים הקרובות. כשהתאריך ידוע, אפשר להכין <a href="/kelim/eruim/hazmana/bar-mitzva/">הזמנה לבר מצווה</a> או <a href="/kelim/eruim/hazmana/bat-mitzva/">לבת מצווה</a>.</p>
  <h3>עוד כלים לתאריכים</h3>
  <p>ללוח חודשי שלם, עם חגים, צומות, ראשי חודשים ופרשות, ולוח להדפסה: <a href="${I.LUACH}">לוח שנה עברי לועזי</a>. לזמני השבת השבוע: <a href="/kodesh/shabat/">כניסת שבת וצאת שבת</a>. לרבנים: <a href="/kodesh/taarichim/">מחשבון תאריכים לרב</a> (ברית, פדיון הבן, שלושים ויארצייט) ו<a href="/kodesh/luach-shana/">לוח השנה לרב ולבית הכנסת</a>.</p>
  <h3>למה זה בחינם</h3>
  <p>הדף הוא חלק ממיזם הכלים של גילעד רחמים: כלים פשוטים, בחינם, בלי הרשמה ובלי פרסומות. החישוב נעשה בטלפון שלכם, לפי מנהג ארץ ישראל.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(ROOT, 'src/pages/kodesh/taarich-ivri'), meta, body);
})();
console.log('נכתבו 2 דפים · היום', C.dmy(CIV), C.heb(T.hdDay));
