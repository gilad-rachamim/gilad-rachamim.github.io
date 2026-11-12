// יוצר את דפי "כניסת שבת וצאת שבת": src/pages/kodesh/shabat/index.html ודף לכל עיר (src/pages/kodesh/shabat/<עיר>/index.html).
// הזמנים שבתוך הדף (לגוגל ולמי שאין לו JavaScript) מחושבים כאן מאותו קוד שרץ בדפדפן: assets/kodesh-shabat.js + hebcal.
// בדפדפן הדף מחשב מחדש בכל כניסה, כך שהוא תמיד מעודכן גם בלי להריץ את הסקריפט הזה.
// רשימת הערים והדקות: CITIES ב-assets/kodesh-shabat.js. הטקסטים כתובים כאן.
// הרצה (פעם בכמה חודשים, כדי לרענן את הלוח שבתוך הדף):  node tools/shabat_pages.js   ואז  python build.py
// מילות החיפוש: ~/.claude/state/kelim-seo/keyword-research-2026-11-12.md (צאת שבת, מתי יוצאת שבת, זמני כניסת שבת).
'use strict';
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js'), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/kodesh-shabat.js'));
const C = S.core(H), CITIES = S.CITIES, HOME = S.HOME;
const OUT = path.join(ROOT, 'src/pages/kodesh/shabat');
const NOW = new Date(), WEEKS = 26;
const TOOL_NAME = 'כניסת שבת וצאת שבת';
const CANDLE_RULE = 'בירושלים 40 דקות, בחיפה ובבית שמש 30 דקות, ובשאר המקומות 20 דקות';

function faqLd(qa) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) + '</script>';
}
function faqHtml(qa) {
  return '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';
}
function options(slug) { return CITIES.map(c => `<option value="${c[0]}"${c[0] === slug ? ' selected' : ''}>${c[1]}</option>`).join(''); }
function chips(cur) {
  return '<nav class="sb-chips" aria-label="זמני השבת בערים נוספות">' + CITIES.map(c => `<a href="${HOME}${c[0]}/"${c[0] === cur ? ' aria-current="page"' : ''}>${c[1]}</a>`).join('') + '</nav>';
}
function tool(city) {
  const main = !city, c = city || CITIES[0];
  const fri = C.firstFriday(NOW, c[3], c[4]), list = C.weeks(c[3], c[4], fri, c[5], WEEKS);
  return `<div class="tool" id="sb" data-city="${main ? '' : c[0]}">
  <form class="k-form" id="sb-form" novalidate>
    <div class="field"><label for="sb-place">${main ? 'איפה?' : 'עיר'}</label><select id="sb-place">${options(c[0])}</select></div>
${main ? '    <div class="field"><div class="sb-loc"><button class="btn btn-line btn-sm" type="button" id="sb-gps">📍 לפי המיקום שלי</button><span class="sb-st" id="sb-st" role="status"></span></div></div>\n' : ''}    <div class="field"><label for="sb-candle">הדלקת נרות</label><select id="sb-candle"><option value="auto">לפי המקום (20, 30 או 40 דק׳)</option><option value="18">18 דקות לפני השקיעה</option><option value="20">20 דקות</option><option value="30">30 דקות</option><option value="40">40 דקות</option></select></div>
  </form>
  <div class="res" id="sb-res">${C.heroHtml(list[0], c[1], null)}</div>
  <p class="vh" id="sb-live" role="status"></p>
  <div class="share-row">
    <a class="btn btn-gold btn-sm" href="#" id="sb-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את זמני השבת</a>
    <button class="btn btn-line btn-sm" type="button" id="sb-copy">להעתיק</button>
  </div>
  <p class="disclaimer">כניסת שבת: זמן הדלקת הנרות, ${CANDLE_RULE} לפני השקיעה (אפשר לשנות). צאת שבת: צאת הכוכבים לפי 8.5° (כמו ברוב הלוחות בארץ). החישוב לפי גובה פני הים ושקיעה מישורית. לזמנים להלכה במקום מסוים – שואלים את הרב.</p>
${main ? '  <p class="disclaimer">המיקום נשאר בטלפון ולא נשלח לשום מקום. הוא נשמר לפעם הבאה.</p>\n' : `  <p class="disclaimer"><a class="gold" href="${HOME}">עיר אחרת, או לפי המיקום שלי ←</a></p>\n`}</div>

<section class="k-sec" aria-labelledby="sb-weeks-h">
  <h2 id="sb-weeks-h">${main ? 'זמני כניסת שבת וצאת שבת לשבתות הבאות' : 'זמני השבת ' + c[2] + ' לשבתות הבאות'}</h2>
  <div id="sb-weeks">${C.weeksHtml(list)}</div>
  <button class="btn btn-line btn-sm sb-more" type="button" id="sb-more">עוד שבתות</button>
</section>
`;
}
function stats(c) {  // טווח הזמנים בעיר במהלך השנה הקרובה (לטקסט של דף העיר)
  const list = C.weeks(c[3], c[4], C.firstFriday(NOW, c[3], c[4]), c[5], 52);
  const hm = d => C.t(d), srt = a => a.slice().sort();
  const cs = srt(list.map(w => hm(w.candle))), hs = srt(list.map(w => hm(w.havdala)));
  return { c0: cs[0], c1: cs[cs.length - 1], h0: hs[0], h1: hs[hs.length - 1] };
}
function write(dir, meta, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
}
const HEAD = '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-shabat.css">';
const FOOT = '<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script><script src="/assets/kodesh-shabat.js" defer></script>';
const SHARE = '<div class="share-row"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="מתי נכנסת השבת ומתי יוצאת שבת, לפי עיר. מתעדכן לבד כל שבוע, בחינם:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את הדף לחבר</a></div>';

// ---------- הדף הראשי ----------
(function () {
  const qa = [
    ['מתי יוצאת שבת השבוע?', 'בראש הדף מופיע זמן צאת השבת לשבת הקרובה, לפי העיר שבחרתם. הזמן הוא צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק.'],
    ['מתי כניסת שבת השבוע?', 'זמן כניסת השבת הוא זמן הדלקת הנרות ביום שישי. הוא מופיע בראש הדף, לפי העיר, ומתעדכן לבד בכל שבוע.'],
    ['כמה דקות לפני השקיעה מדליקים נרות שבת?', 'המנהג שונה ממקום למקום. בדף הזה: ' + CANDLE_RULE + '. אפשר לבחור גם 18, 20, 30 או 40 דקות. מי שלא בטוח מה המנהג במקום שלו, שואל את הרב.'],
    ['היישוב שלי לא ברשימה. מה עושים?', 'לוחצים ״לפי המיקום שלי״, והזמנים מחושבים לפי המקום שבו אתם נמצאים. המיקום נשאר בטלפון ולא נשלח לשום מקום.'],
    ['אפשר לסמוך על הזמנים להלכה?', 'הזמנים מחושבים לפי גובה פני הים, ויש הבדלים קטנים בין הלוחות. לזמנים להלכה במקום מסוים שואלים את הרב.'],
    ['זה בחינם?', 'כן. בחינם, בלי הרשמה ובלי פרסומות.']
  ];
  const fri = C.firstFriday(NOW, CITIES[0][3], CITIES[0][4]);
  const meta = {
    site: 'kodesh', tool: 'shabat', no_hub: true,
    title: 'כניסת שבת וצאת שבת: זמני השבת השבוע לפי עיר | כלי קודש',
    description: 'מתי נכנסת השבת ומתי יוצאת שבת השבוע? זמני כניסת שבת (הדלקת נרות) וצאת שבת בירושלים, בתל אביב, בחיפה, בבאר שבע ובעוד ' + (CITIES.length - 4) + ' ערים, או לפי המיקום שלכם. עם פרשת השבוע ולוח לשבתות הבאות.',
    og_title: 'מתי נכנסת השבת ומתי יוצאת? לפי העיר שלכם',
    priority: '0.8',
    crumbs: [[TOOL_NAME, null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const body = `<header class="k-hero">
  <h1>כניסת שבת וצאת שבת</h1>
  <p class="sub">מתי נכנסת השבת ומתי יוצאת שבת השבוע, לפי העיר שלכם. מתעדכן לבד בכל שבוע.</p>
</header>
${tool(null)}
<section class="k-sec" aria-labelledby="sb-cities-h">
  <h2 id="sb-cities-h">זמני השבת בכל הערים</h2>
  <p class="lead2">לוחצים על שם העיר ומקבלים את הדף שלה, עם השבתות הבאות.</p>
  <div id="sb-cities">${C.citiesHtml(fri)}</div>
  ${SHARE}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">מתי נכנסת השבת ומתי יוצאת שבת השבוע</h2>
  <p>הדף מראה את זמני השבת הקרובה: מתי כניסת שבת, כלומר זמן הדלקת הנרות ביום שישי, ומתי צאת שבת במוצאי שבת. בוחרים עיר מהרשימה, או לוחצים "לפי המיקום שלי", והזמנים מתעדכנים מיד. מתחת מופיעים זמני כניסת שבת ויציאת שבת לשבתות הבאות, עם פרשת השבוע, וטבלה של כל הערים.</p>
  <h3>איך מחושבים הזמנים</h3>
  <p>כניסת שבת היא זמן הדלקת הנרות, כמה דקות לפני השקיעה: ${CANDLE_RULE}. מי שנוהג אחרת בוחר בעצמו 18, 20, 30 או 40 דקות. צאת שבת הוא צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ. השקיעה מחושבת לפי גובה פני הים (שקיעה מישורית). זמן הדלקת הנרות מעוגל לדקה למטה, וזמן צאת השבת לדקה למעלה. זה אותו חישוב שבכלי <a href="/kodesh/zmanim/">זמנים לבסיס</a>.</p>
  <h3>למה הזמנים שונים מעיר לעיר</h3>
  <p>השמש שוקעת קצת מוקדם יותר במזרח הארץ וקצת מאוחר יותר במערב, ואורך היום שונה בין הצפון לדרום. לכן בין אילת, ירושלים, תל אביב וקריית שמונה יש הבדל של כמה דקות. גם המנהג כמה דקות לפני השקיעה מדליקים נרות שונה ממקום למקום.</p>
  <h3>עוד כלים לשבת</h3>
  <p>רוצים את כל זמני היום, כמו הנץ החמה, סוף זמן קריאת שמע ושקיעה? הם בכלי <a href="/kodesh/zmanim/">זמנים לבסיס</a>, לפי GPS. לבית הכנסת יש <a href="/kodesh/luach/">לוח שבועי להדפסה</a> ו<a href="/kodesh/luach-shana/">לוח שנה עם זמני שבת לפי עיר</a>. ולמי שמארח: <a href="/bait/shabat/">תפריט לשבת ומתכנן אורחים</a>.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(OUT, meta, body);
})();

// ---------- דף לכל עיר ----------
for (const c of CITIES) {
  const loc = c[2], s = stats(c);
  const qa = [
    [`מתי כניסת שבת ${loc} השבוע?`, `זמן הדלקת הנרות ${loc} לשבת הקרובה מופיע בראש הדף, ומתעדכן לבד בכל שבוע. הוא מחושב ${c[5]} דקות לפני השקיעה.`],
    [`מתי יוצאת שבת ${loc}?`, `זמן צאת השבת ${loc} מופיע בראש הדף, ליד זמן הכניסה. הוא מחושב לפי צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק.`],
    [`כמה דקות לפני השקיעה מדליקים נרות ${loc}?`, `בדף הזה החישוב ${loc} הוא ${c[5]} דקות לפני השקיעה. אפשר לבחור גם 18, 20, 30 או 40 דקות. מי שלא בטוח מה המנהג אצלו, שואל את הרב.`],
    ['איפה רואים את הזמנים לשבתות הבאות?', `מתחת לזמני השבת הקרובה יש לוח של השבתות הבאות ${loc}, עם פרשת השבוע, כניסת השבת וצאת השבת.`],
    ['אפשר לשלוח את הזמנים בווטסאפ?', 'כן. הכפתור ״לשלוח את זמני השבת״ פותח הודעה מוכנה עם הפרשה, כניסת השבת וצאת השבת.']
  ];
  const meta = {
    site: 'kodesh', tool: 'shabat_ir',
    title: `כניסת שבת וצאת שבת ${loc}: זמני השבת השבוע | כלי קודש`,
    description: `מתי נכנסת השבת ${loc} ומתי יוצאת שבת? זמן הדלקת הנרות וצאת השבת לשבת הקרובה, פרשת השבוע, ולוח זמני כניסת שבת ויציאת שבת ${loc} לשבועות הבאים. מתעדכן לבד בכל שבוע.`,
    og_title: `כניסת שבת וצאת שבת ${loc}`,
    og_image: 'og/kodesh-shabat.jpg?v=4',
    priority: '0.7',
    crumbs: [[TOOL_NAME, HOME], [c[1], null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const body = `<header class="k-hero">
  <h1>כניסת שבת וצאת שבת ${loc}</h1>
  <p class="sub">מתי נכנסת השבת ${loc} ומתי יוצאת שבת השבוע. מתעדכן לבד בכל שבוע.</p>
</header>
${tool(c)}
<section class="k-sec" aria-labelledby="sb-other-h">
  <h2 id="sb-other-h">זמני השבת בערים נוספות</h2>
  ${chips(c[0])}
  ${SHARE}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">מתי נכנסת השבת ${loc} ומתי יוצאת שבת</h2>
  <p>כאן רואים את זמני השבת הקרובה ${loc}: כניסת שבת, כלומר זמן הדלקת הנרות ביום שישי, וצאת שבת במוצאי שבת. הדף מתעדכן לבד בכל שבוע, ומתחת מופיעים הזמנים לשבתות הבאות, עם פרשת השבוע.</p>
  <h3>כניסת שבת ${loc}</h3>
  <p>זמן הדלקת הנרות ${loc} מחושב כאן ${c[5]} דקות לפני השקיעה. בדף הזה: ${CANDLE_RULE}. מי שנוהג אחרת בוחר 18, 20, 30 או 40 דקות, והזמן מתעדכן. בשנה הקרובה כניסת השבת ${loc} נעה בין <bdi>${s.c0}</bdi> בחורף ל-<bdi>${s.c1}</bdi> בקיץ.</p>
  <h3>צאת שבת ${loc}</h3>
  <p>צאת השבת מחושב לפי צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ. בשנה הקרובה צאת השבת ${loc} נע בין <bdi>${s.h0}</bdi> בחורף ל-<bdi>${s.h1}</bdi> בקיץ. השקיעה מחושבת לפי גובה פני הים (שקיעה מישורית), ולכן ייתכנו הבדלים קטנים מלוחות אחרים. לזמנים להלכה שואלים את הרב.</p>
  <h3>עוד כלים לשבת</h3>
  <p>לכל זמני היום, כמו הנץ החמה, סוף זמן קריאת שמע ושקיעה, יש את הכלי <a href="/kodesh/zmanim/">זמנים לבסיס</a>. לערים אחרות, או לפי המיקום שלכם: <a href="${HOME}">כניסת שבת וצאת שבת לפי עיר</a>. ולמי שמארח: <a href="/bait/shabat/">תפריט לשבת ומתכנן אורחים</a>.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(OUT, c[0]), meta, body);
}
console.log('נכתבו', CITIES.length + 1, 'דפים אל', path.relative(ROOT, OUT));
