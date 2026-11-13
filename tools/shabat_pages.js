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
  <p class="disclaimer">כניסת שבת: זמן הדלקת הנרות, ${CANDLE_RULE} לפני השקיעה (אפשר לשנות). צאת שבת: צאת הכוכבים לפי 8.5° (כמו ברוב הלוחות בארץ), ולידו לפי רבנו תם: 72 דקות אחרי השקיעה. החישוב לפי גובה פני הים ושקיעה מישורית. לזמנים להלכה במקום מסוים – שואלים את הרב.</p>
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
    ['מתי יוצאת שבת לפי רבנו תם?', 'לפי רבנו תם השבת יוצאת 72 דקות אחרי השקיעה, כמו בלוחות הנפוצים בארץ. הזמן מופיע בראש הדף מתחת לצאת השבת הרגיל, ובטבלאות בעמודה ״ר״ת״.'],
    ['מתי כניסת שבת השבוע?', 'זמן כניסת השבת הוא זמן הדלקת הנרות ביום שישי. הוא מופיע בראש הדף, לפי העיר, ומתעדכן לבד בכל שבוע.'],
    ['כמה דקות לפני השקיעה מדליקים נרות שבת?', 'המנהג שונה ממקום למקום. בדף הזה: ' + CANDLE_RULE + '. אפשר לבחור גם 18, 20, 30 או 40 דקות. מי שלא בטוח מה המנהג במקום שלו, שואל את הרב.'],
    ['היישוב שלי לא ברשימה. מה עושים?', 'לוחצים ״לפי המיקום שלי״, והזמנים מחושבים לפי המקום שבו אתם נמצאים. המיקום נשאר בטלפון ולא נשלח לשום מקום.'],
    ['אפשר לסמוך על הזמנים להלכה?', 'הזמנים מחושבים לפי גובה פני הים, ויש הבדלים קטנים בין הלוחות. לזמנים להלכה במקום מסוים שואלים את הרב.'],
    ["כמה זמן אחרי השקיעה יוצאת שבת?", "לפי רוב הלוחות בארץ, בערך 30 עד 40 דקות, כשהשמש 8.5 מעלות מתחת לאופק. לפי רבנו תם 72 דקות."],
    ["למה בירושלים מדליקים נרות 40 דקות לפני השקיעה?", "זה מנהג ותיק של ירושלים, כדי להוסיף מן החול על הקודש. בחיפה נוהגים 30 דקות וברוב הערים 20 דקות."],
    ["מתי נכנסת שבת בחורף ומתי בקיץ?", "בחורף השבת נכנסת בארץ סביב 16:00 עד 16:30, ובקיץ סביב 19:00 עד 19:15. הדף מראה את הזמן המדויק לשבת הקרובה."],
    ["איך יודעים זמני שבת ביישוב שלא ברשימה?", "לוחצים \"המיקום שלי\", והזמנים מחושבים לפי המקום המדויק של הטלפון."],
    ['זה בחינם?', 'כן. בחינם, בלי הרשמה ובלי פרסומות.']
  ];
  const fri = C.firstFriday(NOW, CITIES[0][3], CITIES[0][4]);
  const meta = {
    site: 'kodesh', tool: 'shabat', no_hub: true,
    title: 'צאת שבת וכניסת שבת השבוע: זמני השבת לפי עיר | כלי קודש',
    description: 'מתי יוצאת שבת ומתי נכנסת השבת השבוע? זמני צאת שבת וכניסת שבת (הדלקת נרות) וצאת שבת בירושלים, בתל אביב, בחיפה, בבאר שבע ובעוד ' + (CITIES.length - 4) + ' ערים, או לפי המיקום שלכם. עם פרשת השבוע ולוח לשבתות הבאות.',
    og_title: 'מתי נכנסת השבת ומתי יוצאת? לפי העיר שלכם',
    priority: '0.8',
    crumbs: [[TOOL_NAME, null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const body = `<header class="k-hero">
  <h1>צאת שבת וכניסת שבת השבוע</h1>
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
  <p>כניסת שבת היא זמן הדלקת הנרות, כמה דקות לפני השקיעה: ${CANDLE_RULE}. מי שנוהג אחרת בוחר בעצמו 18, 20, 30 או 40 דקות. צאת שבת הוא צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ. מי שנוהג כרבנו תם מוצא לידו גם את צאת השבת לפי רבנו תם: 72 דקות אחרי השקיעה, כמו בלוחות הנפוצים. השקיעה מחושבת לפי גובה פני הים (שקיעה מישורית). זמן הדלקת הנרות מעוגל לדקה למטה, וזמן צאת השבת לדקה למעלה. זה אותו חישוב שבכלי <a href="/kodesh/zmanim/">זמנים לבסיס</a>.</p>
  <h3>למה הזמנים שונים מעיר לעיר</h3>
  <p>השמש שוקעת קצת מוקדם יותר במזרח הארץ וקצת מאוחר יותר במערב, ואורך היום שונה בין הצפון לדרום. לכן בין אילת, ירושלים, תל אביב וקריית שמונה יש הבדל של כמה דקות. גם המנהג כמה דקות לפני השקיעה מדליקים נרות שונה ממקום למקום.</p>
  <h3>עוד כלים לשבת</h3>
  <p>רוצים את כל זמני היום, כמו הנץ החמה, סוף זמן קריאת שמע ושקיעה? הם בכלי <a href="/kodesh/zmanim/">זמני היום לפי המיקום</a>, לפי GPS. לבית הכנסת יש <a href="/kodesh/luach/">לוח שבועי להדפסה</a> ו<a href="/kodesh/luach-shana/">לוח שנה עם זמני שבת לפי עיר</a>. ולמי שמארח: <a href="/bait/shabat/">תפריט לשבת ומתכנן אורחים</a>.</p>
  <h2>צאת שבת: איך מחשבים את הזמן</h2>
  <p>צאת השבת בדף מחושבת לכל עיר לפי הזמן שבו השמש יורדת 8.5 מעלות מתחת לאופק. זה הזמן שמופיע ברוב לוחות השנה בארץ, והוא יוצא בדרך כלל 30 עד 40 דקות אחרי השקיעה, לפי עונת השנה. בחורף השבת יוצאת מוקדם, בסביבות 17:00, ובקיץ אחרי 20:00. מי שנוהג כרבנו תם יראה בדף גם את הזמן של 72 דקות אחרי השקיעה.</p>
  <h3>מתי נכנסת שבת: למה כל עיר שונה</h3>
  <p>כניסת השבת היא זמן הדלקת הנרות, וזה מנהג ולא חישוב אחד. בירושלים נוהגים להדליק 40 דקות לפני השקיעה, בחיפה 30 דקות, וברוב הערים האחרות 20 דקות. לכן ההפרש בין ירושלים לתל אביב בכניסת השבת גדול יותר מההפרש בשקיעה. גם השקיעה עצמה שונה: בעיר שנמצאת מזרחה יותר, כמו טבריה, השמש שוקעת מוקדם יותר מאשר בעיר על חוף הים. מי שגר ביישוב קטן יכול ללחוץ "המיקום שלי" ולקבל זמנים מדויקים למקום שלו.</p>
  <h3>דף נפרד לכל עיר, מתעדכן כל שבוע</h3>
  <p>לכל אחת מ-${CITIES.length} הערים יש דף משלה עם זמני השבת הקרובה, פרשת השבוע ולוח לשבתות הבאות. הדפים מתעדכנים לבד בכל שבוע, כך שאפשר לשמור את הקישור ולחזור אליו. בין הערים: ירושלים, תל אביב, חיפה, באר שבע, בני ברק, פתח תקווה, אשדוד, נתניה, ראשון לציון, בית שמש, מודיעין, אלעד, צפת, טבריה ועוד.</p>
  <h3>שבת בחו"ל ובדרכים</h3>
  <p>בחופשה או בנסיעה לחו"ל הזמנים משתנים מאוד. בצפון אירופה בקיץ השבת יכולה להיכנס אחרי 21:00. הכפתור "המיקום שלי" מחשב את הזמנים לכל מקום בעולם לפי הטלפון. כדאי לבדוק לפני יום שישי, כשיש עדיין קליטה.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(OUT, meta, body);
})();

// ---------- דף לכל עיר ----------
// כל דף עיר מקבל טקסט עם עובדות שמחושבות לעיר עצמה (השוואה לשכנות, השבת המוקדמת והמאוחרת בשנה,
// המעבר לשעון קיץ/חורף, הערים הקרובות), כדי שכל דף יהיה שונה באמת ולא העתק עם שם אחר.
function dist(a, b) { const r = Math.PI / 180, x = (b[4] - a[4]) * r * Math.cos((a[3] + b[3]) / 2 * r), y = (b[3] - a[3]) * r; return Math.sqrt(x * x + y * y) * 6371; }
function minsOf(d) { return Math.round(d.getTime() / 60000); }
function diffText(m, word) {  // "3 דקות מוקדם יותר" / "באותה דקה"
  if (m === 0) return 'באותה דקה';
  const a = Math.abs(m);
  return (a === 1 ? 'דקה אחת' : a === 2 ? 'שתי דקות' : a + ' דקות') + ' ' + (m < 0 ? 'מוקדם יותר' : 'מאוחר יותר') + (word ? ' ' + word : '');
}
function hdm(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
function dur(m) { const h = Math.floor(m / 60), r = m % 60; return (h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות') + (r ? ' ו-' + r + ' דקות' : ''); }
const JER = CITIES[0], TLV = CITIES[1];
const CUSTOM = { 40: 'כמקובל בירושלים', 30: 'כמקובל במקום', 20: 'כמו ברוב הלוחות בארץ' };
CITIES.forEach(function (c, ci) {
  const loc = c[2], s = stats(c);
  const fri = C.firstFriday(NOW, c[3], c[4]);
  const yr = C.weeks(c[3], c[4], fri, c[5], 52), w0 = yr[0];
  const tod = d => d.getHours() * 60 + d.getMinutes();
  const early = yr.reduce((a, b) => tod(b.candle) < tod(a.candle) ? b : a), late = yr.reduce((a, b) => tod(b.candle) > tod(a.candle) ? b : a);
  const lens = yr.map(w => minsOf(w.havdala) - minsOf(w.candle));
  const shortW = yr[lens.indexOf(Math.min.apply(null, lens))], longW = yr[lens.indexOf(Math.max.apply(null, lens))];
  // שבוע שבו הזמן קופץ בשעה בגלל שעון קיץ / חורף
  const jumps = [];
  for (let i = 1; i < yr.length; i++) { const d = tod(yr[i].candle) - tod(yr[i - 1].candle); if (Math.abs(d) >= 40) jumps.push([yr[i], d > 0 ? 'קיץ' : 'חורף']); }
  // השוואה לירושלים ולתל אביב באותה שבת (צאת השבת לא תלוי במנהג ההדלקה, לכן משווים אותו)
  const cmp = [JER, TLV].filter(o => o[0] !== c[0]).map(function (o) {
    const ow = C.week(o[3], o[4], fri, o[5]);
    return { o: o, h: minsOf(w0.havdala) - minsOf(ow.havdala), cand: minsOf(w0.candle) - minsOf(ow.candle) };
  });
  const near = CITIES.filter(o => o[0] !== c[0]).map(o => [o, dist(c, o)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  const nearHtml = near.map(function (x) { const o = x[0], ow = C.week(o[3], o[4], fri, o[5]); return `<a href="${HOME}${o[0]}/">${o[1]}</a> (כ-${Math.round(x[1])} ק״מ: כניסה <bdi>${C.t(ow.candle)}</bdi>, יציאה <bdi>${C.t(ow.havdala)}</bdi>)`; }).join(', ');
  const intro = [
    `כאן רואים מתי נכנסת השבת ${loc} ומתי היא יוצאת, לשבת הקרובה ולשבתות הבאות. השבת הקרובה היא ${w0.title} (${w0.hdate}): הדלקת הנרות ${loc} ביום שישי בשעה <bdi>${C.t(w0.candle)}</bdi>, וצאת השבת במוצאי שבת בשעה <bdi>${C.t(w0.havdala)}</bdi>.`,
    `${w0.title} (${w0.hdate}) ${loc}: כניסת השבת, כלומר הדלקת הנרות, ביום שישי בשעה <bdi>${C.t(w0.candle)}</bdi>, וצאת השבת בשעה <bdi>${C.t(w0.havdala)}</bdi>. הדף מתעדכן לבד בכל שבוע, ובלוח שלמעלה יש את הזמנים לשבתות הבאות עם פרשת השבוע.`,
    `מחפשים מתי יוצאת שבת ${loc}? בשבת הקרובה, ${w0.title} (${w0.hdate}), השבת נכנסת בשעה <bdi>${C.t(w0.candle)}</bdi> ויוצאת בשעה <bdi>${C.t(w0.havdala)}</bdi>. הזמנים מחושבים לבד לכל שבוע, ולכן הדף תמיד מראה את השבת הקרובה.`
  ][ci % 3];
  const cmpTxt = cmp.map(x => `צאת השבת ${loc} יוצא ${diffText(x.h)} מאשר ב${x.o[1]}`).join(', ו');
  const qa = [
    [`מתי כניסת שבת ${loc} השבוע?`, `בשבת הקרובה, ${w0.title}, הדלקת הנרות ${loc} היא בשעה ${C.t(w0.candle)}, ${c[5]} דקות לפני השקיעה. בכל שבוע הדף מתעדכן לבד.`],
    [`מתי יוצאת שבת ${loc}?`, `בשבת הקרובה השבת יוצאת ${loc} בשעה ${C.t(w0.havdala)}. החישוב לפי צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק.`],
    [`מתי יוצאת שבת ${loc} לפי רבנו תם?`, `בשבת הקרובה השבת יוצאת ${loc} לפי רבנו תם בשעה ${C.t(w0.rt)}, 72 דקות אחרי השקיעה, כמו בלוחות הנפוצים בארץ.`],
    [`כמה דקות לפני השקיעה מדליקים נרות ${loc}?`, `בדף הזה החישוב ${loc} הוא ${c[5]} דקות לפני השקיעה, ${CUSTOM[c[5]]}. אפשר לבחור גם 18, 20, 30 או 40 דקות. מי שלא בטוח מה המנהג אצלו, שואל את הרב.`],
    [`מתי השבת נכנסת הכי מוקדם ${loc}?`, `בשנה הקרובה ההדלקה המוקדמת ביותר ${loc} היא ב${early.title}, ${hdm(early.fri)}, בשעה ${C.t(early.candle)}. המאוחרת ביותר: ב${late.title}, ${hdm(late.fri)}, בשעה ${C.t(late.candle)}.`],
    [`יש הבדל בין ${c[1]} לערים אחרות?`, cmpTxt + `. ההבדל נובע מהמיקום: ככל שהעיר מזרחית יותר השמש שוקעת בה מוקדם יותר, וגם הצפון והדרום משנים מעט.`],
    ['אפשר לשלוח את הזמנים בווטסאפ?', 'כן. הכפתור ״לשלוח את זמני השבת״ פותח הודעה מוכנה עם הפרשה, כניסת השבת וצאת השבת.']
  ];
  const meta = {
    site: 'kodesh', tool: 'shabat_ir',
    title: `כניסת שבת וצאת שבת ${loc}: זמני השבת השבוע | כלי קודש`,
    description: `מתי נכנסת השבת ${loc} ומתי יוצאת שבת? זמן הדלקת הנרות (${c[5]} דקות לפני השקיעה) וצאת השבת לשבת הקרובה, פרשת השבוע, ולוח זמני כניסת שבת ויציאת שבת ${loc} לשבועות הבאים. בחינם, מתעדכן לבד בכל שבוע.`,
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
  <p>${intro}</p>
  <h3>כניסת שבת ${loc}: הדלקת נרות ${c[5]} דקות לפני השקיעה</h3>
  <p>זמן הדלקת הנרות ${loc} מחושב כאן ${c[5]} דקות לפני השקיעה, ${CUSTOM[c[5]]}. בדף הזה: ${CANDLE_RULE}. מי שנוהג אחרת בוחר 18, 20, 30 או 40 דקות, והזמן מתעדכן מיד. בשנה הקרובה כניסת השבת ${loc} נעה בין <bdi>${s.c0}</bdi> ל-<bdi>${s.c1}</bdi>: ההדלקה המוקדמת ביותר היא ב${early.title} (${hdm(early.fri)}), והמאוחרת ביותר ב${late.title} (${hdm(late.fri)}).</p>
  <h3>צאת שבת ${loc} ויציאת השבת לפי צאת הכוכבים</h3>
  <p>צאת השבת מחושב לפי צאת הכוכבים, כשהשמש 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ. לפי רבנו תם השבת יוצאת 72 דקות אחרי השקיעה, ובשבת הקרובה ${loc} זה בשעה <bdi>${C.t(w0.rt)}</bdi>. בשנה הקרובה צאת השבת ${loc} נע בין <bdi>${s.h0}</bdi> ל-<bdi>${s.h1}</bdi>. השבת הקצרה ביותר ${loc} השנה היא ${shortW.title} (${dur(Math.min.apply(null, lens))} מההדלקה עד היציאה), והארוכה ביותר ${longW.title} (${dur(Math.max.apply(null, lens))}).${jumps.length ? ' ' + jumps.map(j => `ב${j[0].title} (${hdm(j[0].fri)}) הזמנים זזים בבת אחת בכשעה, בגלל המעבר לשעון ${j[1]}.`).join(' ') : ''}</p>
  <h3>${c[1]} מול ערים אחרות</h3>
  <p>בשבת הקרובה ${cmpTxt}. הסיבה היא המיקום: ככל שהעיר מזרחית יותר, השמש שוקעת בה מוקדם יותר, וגם המרחק צפונה או דרומה משנה מעט. הערים הקרובות ל${c[1]}: ${nearHtml}.</p>
  <h3>איך מחושבים הזמנים</h3>
  <p>השקיעה מחושבת לפי גובה פני הים (שקיעה מישורית), ולכן ייתכנו הבדלים של דקה-שתיים מלוחות אחרים. זמן הדלקת הנרות מעוגל לדקה למטה, וצאת השבת לדקה למעלה. זה אותו חישוב שבכלי <a href="/kodesh/zmanim/">זמנים לבסיס</a>, שמראה גם את כל זמני היום. לזמנים להלכה שואלים את הרב. ערים נוספות, או לפי המיקום שלכם: <a href="${HOME}">כניסת שבת וצאת שבת לפי עיר</a>. ולמי שמארח: <a href="/bait/shabat/">תפריט לשבת ומתכנן אורחים</a>.</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(OUT, c[0]), meta, body);
});
console.log('נכתבו', CITIES.length + 1, 'דפים אל', path.relative(ROOT, OUT));
