// יוצר את דפי "זמני היום ב<עיר>": src/pages/kodesh/zmanim/<עיר>/index.html, לכל עיר ב-CITIES של assets/kodesh-shabat.js.
// הכלי עצמו (הטופס) מועתק מהדף הראשי src/pages/kodesh/zmanim/index.html, כך ששינוי שם עובר לכל הערים בהרצה הבאה.
// הטבלה שבתוך הדף (לגוגל ולמי שאין לו JavaScript) מחושבת כאן ליום ההרצה; בדפדפן assets/zmanim.js מחשב מחדש בכל כניסה.
// העובדות המקומיות (המקום והגובה): tools/shabat_local.js.
// הרצה (פעם בכמה חודשים, יחד עם tools/shabat_pages.js):  node tools/zmanim_pages.js   ואז  python build.py
'use strict';
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js'), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/kodesh-shabat.js'));
const LOCAL = require('./shabat_local.js');
const CITIES = S.CITIES, HOME = '/kodesh/zmanim/', SHABAT = S.HOME;
const OUT = path.join(ROOT, 'src/pages/kodesh/zmanim');
const NOW = new Date(); NOW.setHours(12, 0, 0, 0);

// ---- הכלי והעיצוב מהדף הראשי
const MAIN = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').split(String.fromCharCode(13)).join('');
const MAIN_META = JSON.parse(MAIN.match(/<!--meta\s*(\{[\s\S]*?\})\s*-->/)[1]);
const STYLE = MAIN_META.head.match(/<style>[\s\S]*?<\/style>/)[0];
const TOOL = MAIN.match(/<div class="tool">[\s\S]*?\n<\/div>\n(?=<!--seo-txt-->)/)[0].replace(/\r/g, '');
const HEAD = '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-shabat.css">' + STYLE;
const FOOT = MAIN_META.foot;

// ---- חישובים
const fmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
const fmts = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
const t = d => fmt.format(d), ts = d => fmts.format(d);
const hdm = d => d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
const gl = c => new H.GeoLocation(c[1], c[3], c[4], 0, 'Asia/Jerusalem');
const Z = (c, d) => new H.Zmanim(gl(c), d, false);
const tod = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
const ROWS = [
  ['עלות השחר', z => z.alotHaShachar()], ['זמן ציצית ותפילין (משיכיר)', z => z.misheyakir()], ['הנץ החמה', z => z.sunrise(), 1],
  ['סוף זמן קריאת שמע', z => z.sofZmanShma(), 0, z => z.sofZmanShmaMGA()], ['סוף זמן תפילה', z => z.sofZmanTfilla(), 0, z => z.sofZmanTfillaMGA()],
  ['חצות היום', z => z.chatzot()], ['מנחה גדולה', z => z.minchaGedola()], ['מנחה קטנה', z => z.minchaKetana()],
  ['פלג המנחה', z => z.plagHaMincha()], ['שקיעה', z => z.sunset(), 1], ['צאת הכוכבים', z => z.tzeit(8.5)]
];
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
function table(c) {
  const z = Z(c, NOW);
  return `<h3>יום ${DAYS[NOW.getDay()]}, ${new H.HDate(NOW).renderGematriya(true)} (${hdm(NOW)})</h3><p class="zm-st">${c[1]}, מרכז העיר</p><table class="zm-tbl">` +
    ROWS.map(r => `<tr${r[2] ? ' class="hl"' : ''}><td>${r[0]}${r[3] ? ' <small>מג״א: ' + t(r[3](z)) + '</small>' : ''}</td><td class="t">${t(r[1](z))}</td></tr>`).join('') + '</table>';
}
function year(c) {  // 365 הימים הבאים
  const out = [];
  for (let i = 0; i < 365; i++) { const d = new Date(NOW); d.setDate(d.getDate() + i); const z = Z(c, d); out.push({ d, rise: z.sunrise(), set: z.sunset(), shma: z.sofZmanShma() }); }
  const by = (k, f) => out.reduce((a, b) => f(tod(b[k]), tod(a[k])) ? b : a);
  const len = x => (x.set - x.rise) / 60000;
  const longD = out.reduce((a, b) => len(b) > len(a) ? b : a), shortD = out.reduce((a, b) => len(b) < len(a) ? b : a);
  return { riseE: by('rise', (x, y) => x < y), riseL: by('rise', (x, y) => x > y), setE: by('set', (x, y) => x < y), setL: by('set', (x, y) => x > y),
    shmaE: by('shma', (x, y) => x < y), shmaL: by('shma', (x, y) => x > y), longD, shortD, len };
}
function dur(m) { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h + ' שעות' + (r ? ' ו-' + r + ' דקות' : ''); }
function secTxt(n) {  // "37 שניות מוקדם יותר" / "3 דקות ו-12 שניות מאוחר יותר"
  if (n === 0) return 'באותה שנייה';
  const a = Math.abs(n), m = Math.floor(a / 60), s = a % 60;
  return (m ? (m === 1 ? 'דקה' : m + ' דקות') + (s ? ' ו-' + s + ' שניות' : '') : s + ' שניות') + (n < 0 ? ' מוקדם יותר' : ' מאוחר יותר');
}
function dist(a, b) { const r = Math.PI / 180, x = (b[4] - a[4]) * r * Math.cos((a[3] + b[3]) / 2 * r), y = (b[3] - a[3]) * r; return Math.sqrt(x * x + y * y) * 6371; }
// כמה שניות זזה השקיעה בקילומטר מזרחה, בקו הרוחב של העיר (240 שניות למעלה, חלקי ק"מ למעלה)
const secPerKm = c => 240 / (111.32 * Math.cos(c[3] * Math.PI / 180));
const ELEV = { yerushalaim: 800, 'beer-sheva': 260, dimona: 550, hevron: 900, tzfat: 900, afula: 60 };  // רק גבהים שכתובים גם ב-shabat_local.js

function faqLd(qa) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) + '</script>';
}
function faqHtml(qa) {
  return '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';
}
function chips(cur) {
  return '<nav class="sb-chips" aria-label="זמני היום בערים נוספות">' + CITIES.map(c => `<a href="${HOME}${c[0]}/"${c[0] === cur ? ' aria-current="page"' : ''}>${c[1]}</a>`).join('') + '</nav>';
}
function write(dir, meta, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
}

const JER = CITIES[0], TLV = CITIES[1];
CITIES.forEach(function (c, ci) {
  const loc = c[2], L = LOCAL[c[0]];
  if (!L) throw new Error('חסרות עובדות מקומיות לעיר ' + c[0] + ' ב-tools/shabat_local.js');
  const code = (ci * 37 + 11) % 243, v = k => Math.floor(code / Math.pow(3, k)) % 3;
  const z = Z(c, NOW), Y = year(c), date = hdm(NOW);
  const rise = t(z.sunrise()), set = t(z.sunset()), shma = t(z.sofZmanShma()), shmaM = t(z.sofZmanShmaMGA()), tzeit = t(z.tzeit(8.5)), plag = t(z.plagHaMincha());
  const cmp = [JER, TLV].filter(o => o[0] !== c[0]).map(o => {
    const oz = Z(o, NOW);
    return { o, set: Math.round((z.sunset() - oz.sunset()) / 1000), rise: Math.round((z.sunrise() - oz.sunrise()) / 1000) };
  });
  const cmpTxt = cmp.map(x => `השקיעה ${loc} ${secTxt(x.set)} מאשר ב${x.o[1]}, והזריחה ${secTxt(x.rise)}`).join('; ');
  const near = CITIES.filter(o => o[0] !== c[0]).map(o => [o, dist(c, o)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  const nearHtml = near.map(x => `<a href="${HOME}${x[0][0]}/">זמני היום ב${x[0][1]}</a> (כ-${Math.round(x[1])} ק״מ, שקיעה <bdi>${ts(Z(x[0], NOW).sunset())}</bdi>)`).join(', ');
  const spk = secPerKm(c), el = ELEV[c[0]];
  const elevTxt = el ? (() => { const ze = new H.Zmanim(new H.GeoLocation('', c[3], c[4], el, 'Asia/Jerusalem'), NOW, true);
    return ` בגובה של כ-${el} מטר רואים את השמש כ-${Math.round((ze.sunset() - z.sunset()) / 60000)} דקות אחרי השקיעה בגובה פני הים (ב-${date}: <bdi>${t(ze.sunset())}</bdi> במקום <bdi>${set}</bdi>).`; })() : '';

  const intro = [
    `כאן רואים את כל זמני היום ${loc}: עלות השחר, הנץ החמה, סוף זמן קריאת שמע ותפילה, חצות, מנחה, פלג המנחה, שקיעה וצאת הכוכבים. למשל ב-${date}: הנץ <bdi>${rise}</bdi>, סוף זמן קריאת שמע <bdi>${shma}</bdi>, ושקיעה <bdi>${set}</bdi>. בטלפון הדף מחשב לבד את הזמנים של היום, ואפשר לבחור כל תאריך.`,
    `זמני היום ${loc} משתנים כל יום. ב-${date} הזריחה (הנץ החמה) ${loc} בשעה <bdi>${rise}</bdi>, סוף זמן קריאת שמע לפי הגר״א <bdi>${shma}</bdi>, השקיעה <bdi>${set}</bdi> וצאת הכוכבים <bdi>${tzeit}</bdi>. הכלי שלמעלה מחשב את הזמנים להיום, או לכל תאריך שבוחרים.`,
    `מתי שקיעה היום ${loc}? מתי סוף זמן קריאת שמע? הטבלה שלמעלה עונה על הכול, להיום או לכל תאריך. לדוגמה, ב-${date}: עלות השחר <bdi>${t(z.alotHaShachar())}</bdi>, הנץ <bdi>${rise}</bdi>, פלג המנחה <bdi>${plag}</bdi>, שקיעה <bdi>${set}</bdi>.`
  ][v(0)];
  const exactP = [
    `הזמנים בטבלה הם של מרכז ${c[1]}. אבל השקיעה תלויה במקום המדויק: בקו ${loc} כל קילומטר מזרחה מקדים את השקיעה בכ-${spk.toFixed(1)} שניות, וכל קילומטר מערבה מאחר אותה. לכן בשכונה בקצה העיר השקיעה יכולה להיות שונה בכמה שניות עד עשרות שניות. לחיצה על "המיקום שלי עכשיו" נותנת את הזמן של המקום שבו אתם עומדים, בדיוק של שניות, וגם כמה הוא שונה ממרכז העיר.`,
    `לוח רגיל נותן ${loc} זמן אחד, לפי מרכז העיר. בפועל, לכל רחוב יש שקיעה משלו: קילומטר מזרחה מקדים אותה בכ-${spk.toFixed(1)} שניות, וקילומטר מערבה מאחר. רוצים את הזמן של הבית שלכם? לוחצים "המיקום שלי עכשיו", ומתחת לטבלה מופיעה השקיעה בשניות, וההבדל ממרכז ${c[1]}.`,
    `גם בתוך ${c[1]} אין שקיעה אחת. ההבדל בין מזרח העיר למערבה הוא כ-${spk.toFixed(1)} שניות לכל קילומטר, ומקום גבוה רואה את השמש עוד כמה דקות. הכפתור "המיקום שלי עכשיו" מחשב לפי הנקודה המדויקת של הטלפון, ומראה את השקיעה בשניות, לצד מרכז העיר.`
  ][v(1)] + elevTxt;
  const yearP = [
    `בשנה הקרובה הזריחה ${loc} נעה בין <bdi>${t(Y.riseE.rise)}</bdi> (${hdm(Y.riseE.d)}) ל-<bdi>${t(Y.riseL.rise)}</bdi> (${hdm(Y.riseL.d)}), והשקיעה בין <bdi>${t(Y.setE.set)}</bdi> (${hdm(Y.setE.d)}) ל-<bdi>${t(Y.setL.set)}</bdi> (${hdm(Y.setL.d)}). היום הארוך ביותר הוא ${hdm(Y.longD.d)}, ${dur(Y.len(Y.longD))} מהנץ עד השקיעה, והקצר ביותר ${hdm(Y.shortD.d)}, ${dur(Y.len(Y.shortD))}.`,
    `השקיעה הכי מוקדמת ${loc} בשנה הקרובה תהיה ב-${hdm(Y.setE.d)}, בשעה <bdi>${t(Y.setE.set)}</bdi>, והכי מאוחרת ב-${hdm(Y.setL.d)}, בשעה <bdi>${t(Y.setL.set)}</bdi>. הזריחה המוקדמת ביותר: <bdi>${t(Y.riseE.rise)}</bdi>, והמאוחרת: <bdi>${t(Y.riseL.rise)}</bdi>. ביום הארוך בשנה יש ${dur(Y.len(Y.longD))} של אור, וביום הקצר ${dur(Y.len(Y.shortD))}.`,
    `במשך השנה זמני היום ${loc} זזים בהרבה: היום הקצר ביותר (${hdm(Y.shortD.d)}) נמשך ${dur(Y.len(Y.shortD))}, והארוך ביותר (${hdm(Y.longD.d)}) ${dur(Y.len(Y.longD))}. השקיעה נעה בין <bdi>${t(Y.setE.set)}</bdi> ל-<bdi>${t(Y.setL.set)}</bdi>, והזריחה בין <bdi>${t(Y.riseE.rise)}</bdi> ל-<bdi>${t(Y.riseL.rise)}</bdi>. במעבר לשעון קיץ ולשעון חורף הכול קופץ בשעה, והדף מחשב את זה לבד.`
  ][v(2)];
  const shmaP = [
    `סוף זמן קריאת שמע הוא סוף השעה השלישית ביום, בשעות זמניות. לפי הגר״א סופרים מהנץ עד השקיעה, ולפי המגן אברהם מעלות השחר עד צאת הכוכבים, ולכן הזמן לפיו מוקדם יותר. ב-${date} ${loc}: לפי הגר״א <bdi>${shma}</bdi>, ולפי המג״א <bdi>${shmaM}</bdi>. בשנה הקרובה סוף זמן קריאת שמע לפי הגר״א נע בין <bdi>${t(Y.shmaE.shma)}</bdi> ל-<bdi>${t(Y.shmaL.shma)}</bdi>.`,
    `סוף זמן קריאת שמע ${loc} מחושב לפי שעות זמניות: היום מחולק ל-12 חלקים שווים, וסוף הזמן הוא סוף החלק השלישי. ב-${date} זה <bdi>${shma}</bdi> לפי הגר״א, ו-<bdi>${shmaM}</bdi> לפי המגן אברהם. במשך השנה הזמן לפי הגר״א זז בין <bdi>${t(Y.shmaE.shma)}</bdi> ל-<bdi>${t(Y.shmaL.shma)}</bdi>, ולכן כדאי לבדוק אותו ביום עצמו.`,
    `הטבלה מראה את סוף זמן קריאת שמע ${loc} בשתי השיטות: הגר״א, מהנץ עד השקיעה, והמגן אברהם, מעלות השחר עד צאת הכוכבים, בסוגריים. ב-${date}: <bdi>${shma}</bdi> לפי הגר״א, <bdi>${shmaM}</bdi> לפי המג״א. בחורף הזמן מוקדם יותר ובקיץ מאוחר יותר; השנה הוא נע בין <bdi>${t(Y.shmaE.shma)}</bdi> ל-<bdi>${t(Y.shmaL.shma)}</bdi>.`
  ][v(3)];
  const calcP = [
    'החישוב אסטרונומי: לפי קו הרוחב, קו האורך והתאריך מחשבים את מקום השמש. השקיעה היא כשהקצה העליון של השמש יורד אל האופק, בגובה פני הים. צאת הכוכבים לפי 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ. לזמנים להלכה במקום מסוים שואלים את הרב.',
    'הזמנים מחושבים בטלפון, לפי מיקום העיר והתאריך, בשקיעה מישורית (גובה פני הים), כמו ברוב לוחות השנה. צאת הכוכבים מחושב כשהשמש 8.5 מעלות מתחת לאופק. בין לוחות שונים יש לפעמים הבדל של דקה. לשאלה להלכה, שואלים את הרב.',
    'זו אותה נוסחה אסטרונומית שרוב לוחות הזמנים משתמשים בה: מקום השמש לפי קו הרוחב, קו האורך והתאריך, ושקיעה בגובה פני הים. מי שעומד גבוה רואה את השמש עוד כמה דקות, ויש לוחות שמחשבים שקיעה נראית לפי ההרים. באיזה זמן לנהוג, כל אחד לפי מנהגו ורבו.'
  ][v(4)];

  const qa = [
    [[`מתי שקיעה היום ${loc}?`, `הדף מחשב לבד את השקיעה של היום ${loc}. למשל ב-${date} השקיעה במרכז העיר הייתה ב-${set}. לזמן המדויק במקום שלכם לוחצים "המיקום שלי עכשיו".`],
     [`באיזו שעה השקיעה ${loc}?`, `זה תלוי בתאריך. ב-${date} השקיעה במרכז ${c[1]} הייתה ב-${set}, ובמשך השנה היא נעה בין ${t(Y.setE.set)} ל-${t(Y.setL.set)}. הדף מראה את השקיעה של היום.`],
     [`מתי השמש שוקעת ${loc} היום?`, `בראש הדף מופיעה השקיעה של היום, ומתחת לטבלה גם בדיוק של שניות. ב-${date}, למשל: ${ts(z.sunset())}.`]][v(0)],
    [[`מתי הנץ החמה ${loc}?`, `ב-${date} הנץ החמה ${loc} היה ב-${rise}. במשך השנה הוא נע בין ${t(Y.riseE.rise)} ל-${t(Y.riseL.rise)}. הדף מראה את הנץ של היום.`],
     [`מתי זריחה ${loc}?`, `הזריחה (הנץ החמה) ${loc} ב-${date} הייתה ב-${rise}. בכל יום הדף מחשב אותה מחדש.`],
     [`באיזו שעה הנץ ${loc}?`, `ב-${date}: ${rise}. המוקדם ביותר בשנה ${t(Y.riseE.rise)}, והמאוחר ביותר ${t(Y.riseL.rise)}.`]][v(1)],
    [[`מתי סוף זמן קריאת שמע ${loc}?`, `ב-${date}: ${shma} לפי הגר״א, ו-${shmaM} לפי המגן אברהם. הדף מראה את שתי השיטות לכל תאריך.`],
     [`עד מתי אפשר לקרוא קריאת שמע ${loc}?`, `עד סוף השעה השלישית ביום. ב-${date} ${loc}: ${shma} לפי הגר״א ו-${shmaM} לפי המג״א. מי שלא יודע מה המנהג שלו, מקדים.`],
     [`סוף זמן קריאת שמע ${loc} לפי הגר״א ולפי המג״א?`, `ב-${date}: הגר״א ${shma}, המג״א ${shmaM}. ההבדל בין השיטות בערך 35 עד 40 דקות.`]][v(2)],
    [[`מתי צאת הכוכבים ${loc}?`, `ב-${date} צאת הכוכבים ${loc} היה ב-${tzeit}, כשהשמש 8.5 מעלות מתחת לאופק, כמו ברוב הלוחות בארץ.`],
     [`מתי מתחיל הלילה ${loc}?`, `בצאת הכוכבים. ב-${date} ${loc} זה היה ב-${tzeit}. החישוב: השמש 8.5 מעלות מתחת לאופק.`],
     [`באיזו שעה צאת הכוכבים ${loc} היום?`, `הדף מחשב את זה לכל יום. ב-${date}, למשל, ${tzeit}. זה הזמן שבו נגמר היום להלכה לפי רוב הלוחות.`]][v(3)],
    [[`הזמנים מתאימים לכל ${c[1]}?`, `הטבלה היא של מרכז העיר. כל קילומטר מזרחה מקדים את השקיעה בכ-${spk.toFixed(1)} שניות, ומקום גבוה רואה את השמש יותר זמן. "המיקום שלי עכשיו" נותן את הזמן המדויק של המקום שלכם.`],
     [`יש הבדל בזמנים בין שכונות ב${c[1]}?`, `כן, קטן. בערך ${spk.toFixed(1)} שניות לכל קילומטר מזרחה או מערבה, ובמקום גבוה כמה דקות. לחיצה על "המיקום שלי עכשיו" מחשבת לפי הבית שלכם.`],
     [`אפשר לקבל זמני היום לפי הכתובת שלי ${loc}?`, `כן. לוחצים "המיקום שלי עכשיו", והזמנים מחושבים לפי המקום המדויק של הטלפון, עם השקיעה בשניות וההבדל ממרכז העיר.`]][v(4)],
    [[`יש הבדל בין ${c[1]} לערים אחרות?`, cmpTxt + '. ההבדל נובע מקו האורך וקו הרוחב של כל עיר.'],
     [`${c[1]} מול ירושלים: מי מקדים?`, cmpTxt + '.'],
     [`למה השקיעה ${loc} שונה מעיר אחרת?`, 'בגלל המיקום: עיר מזרחית יותר רואה שקיעה מוקדמת יותר, וגם הצפון והדרום משנים. ' + cmpTxt + '.']][v(0)]
  ];
  const meta = {
    site: 'kodesh', tool: 'zmanim_ir',
    title: `זמני היום ${loc}: הנץ, סוף זמן קריאת שמע, שקיעה וצאת הכוכבים | כלי קודש`,
    description: `זמני היום ${loc} להיום ולכל תאריך: עלות השחר, הנץ החמה, סוף זמן קריאת שמע ותפילה (גר״א ומג״א), חצות, מנחה, פלג המנחה, שקיעה וצאת הכוכבים. גם לפי המיקום המדויק שלכם בעיר, עם שקיעה בשניות. בחינם.`,
    og_title: `זמני היום ${loc}`,
    priority: '0.6',
    crumbs: [['זמני היום', HOME], [c[1], null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const tool = TOOL.replace('<form class="k-form" id="zm-form" novalidate>', `<form class="k-form" id="zm-form" novalidate data-city="${c[0]}">`)
    .replace('<div class="res" id="zm-res" aria-live="polite"><p>טוען את לוח השנה…</p></div>', `<div class="res" id="zm-res" aria-live="polite">${table(c)}</div>`)
    .replace('<label for="zm-place">או לבחור עיר</label>', '<label for="zm-place">עיר</label>');
  if (tool.indexOf('data-city=') < 0 || tool.indexOf('zm-tbl') < 0) throw new Error('הטופס בדף הראשי השתנה – לעדכן את zmanim_pages.js');
  const body = `<header class="k-hero">
  <h1>זמני היום ${loc}</h1>
  <p class="sub">הנץ החמה, סוף זמן קריאת שמע, מנחה, שקיעה וצאת הכוכבים ${loc}, להיום ולכל תאריך. לפי מרכז העיר, או לפי המקום המדויק שלכם.</p>
</header>
${tool}
<section class="k-sec" aria-labelledby="zm-other-h">
  <h2 id="zm-other-h">זמני היום בערים נוספות</h2>
  ${chips(c[0])}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">${['זמני היום ' + loc + ' היום', 'כל זמני היום ' + loc, 'זמני היום ' + loc + ': הנץ, קריאת שמע ושקיעה'][v(0)]}</h2>
  <p>${intro}</p>
  <h3>${['השקיעה ' + loc + ' לפי המקום המדויק', 'לכל שכונה ' + loc + ' שקיעה משלה', 'מרכז העיר או המיקום שלכם'][v(1)]}</h3>
  <p>${exactP}</p>
  <h3>${c[1]}: המקום</h3>
  <p>${L.geo}</p>
  <h3>${['זמני היום ' + loc + ' במשך השנה', 'הזריחה והשקיעה ' + loc + ' לאורך השנה', 'היום הארוך והקצר ' + loc][v(2)]}</h3>
  <p>${yearP}</p>
  <h3>${['סוף זמן קריאת שמע ' + loc, 'קריאת שמע ' + loc + ': גר״א ומגן אברהם', 'עד מתי קריאת שמע ' + loc][v(3)]}</h3>
  <p>${shmaP}</p>
  <h3>${c[1]} מול ירושלים ותל אביב</h3>
  <p>ב-${date}: ${cmpTxt}. הערים הקרובות: ${nearHtml}.</p>
  <h3>${['איך מחושבים הזמנים', 'מאיפה הזמנים', 'דיוק הזמנים'][v(4)]}</h3>
  <p>${calcP} ${[`עוד: <a href="${SHABAT}${c[0]}/">כניסת שבת וצאת שבת ${loc}</a>, <a href="${HOME}">זמני היום לפי המיקום, גם בבסיס ובשטח</a>, ו<a href="/kodesh/luach-shana/">לוח שנה עברי להדפסה</a>. הכול בחינם, בלי הרשמה ובלי פרסומות.`,
    `לשבת: <a href="${SHABAT}${c[0]}/">מתי נכנסת השבת ${loc}</a>. ללוח של כל השנה: <a href="/kodesh/luach-shana/">לוח שנה עברי</a>. ולבסיס או לטיול: <a href="${HOME}">זמנים לפי GPS</a>. בחינם ובלי הרשמה.`,
    `קשור: <a href="${SHABAT}${c[0]}/">זמני כניסת השבת ויציאתה ${loc}</a>, <a href="/kodesh/luach-shana/">לוח השנה להדפסה</a>, ו<a href="${HOME}">זמני היום בכל מקום בעולם לפי הטלפון</a>. אין פרסומות ואין צורך להירשם.`][v(2)]}</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(OUT, c[0]), meta, body);
});
console.log('נכתבו', CITIES.length, 'דפים אל', path.relative(ROOT, OUT));
